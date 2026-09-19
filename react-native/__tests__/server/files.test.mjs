import {makeProject, startServer} from './helpers.mjs';

let server;
let project;

beforeAll(async () => {
  server = await startServer();
});

afterAll(() => server.close());

beforeEach(async () => {
  project = await makeProject({
    'README.md': '# hello\n',
    'src/index.js': 'console.log(1);\n',
    'src/util/math.js': 'export const add = (a, b) => a + b;\n',
  });
});

afterEach(() => project.remove());

const query = (extra = {}) => ({projectRoot: project.root, ...extra});

test('health reports ok', async () => {
  const {status, json} = await server.request('GET', '/health');
  expect(status).toBe(200);
  expect(json.ok).toBe(true);
});

test('lists a directory with folders and files', async () => {
  const {status, json} = await server.request('GET', '/files', {query: query({path: ''})});
  expect(status).toBe(200);
  expect(json.contents.map(entry => entry.name).sort()).toEqual(['README.md', 'src']);
  expect(json.contents.find(entry => entry.name === 'src').isDirectory).toBe(true);
});

test('reads a file with its mtime', async () => {
  const {json} = await server.request('GET', '/file', {query: query({path: 'src/index.js'})});
  expect(json.contents).toBe('console.log(1);\n');
  expect(typeof json.mtime).toBe('number');
});

test('refuses a path that escapes the project', async () => {
  const {status, json} = await server.request('GET', '/file', {query: query({path: '../../etc/passwd'})});
  expect(status).toBe(400);
  expect(json.error).toMatch(/escapes/);
});

test('refuses a request without a project root', async () => {
  const {status} = await server.request('GET', '/file', {query: {path: 'x'}});
  expect(status).toBe(400);
});

test('404s a missing file and an unknown route', async () => {
  const missing = await server.request('GET', '/file', {query: query({path: 'nope.js'})});
  expect(missing.status).toBe(404);

  const unknown = await server.request('GET', '/nothing');
  expect(unknown.status).toBe(404);
});

test('writes a file and returns the new mtime', async () => {
  const {status, json} = await server.request('PUT', '/file', {
    query: query({path: 'src/index.js'}),
    body: {contents: 'console.log(2);\n'},
  });
  expect(status).toBe(200);
  expect(typeof json.mtime).toBe('number');
  expect(await project.read('src/index.js')).toBe('console.log(2);\n');
});

test('a write against a stale mtime is a conflict', async () => {
  const before = await server.request('GET', '/file', {query: query({path: 'README.md'})});

  // Someone else writes in between, with a clearly different mtime.
  await server.request('PUT', '/file', {query: query({path: 'README.md'}), body: {contents: 'other\n'}});
  const {json: fresh} = await server.request('GET', '/file', {query: query({path: 'README.md'})});

  const {status} = await server.request('PUT', '/file', {
    query: query({path: 'README.md'}),
    body: {contents: 'mine\n', expectedMtime: before.json.mtime - 5000},
  });
  expect(status).toBe(409);
  expect(await project.read('README.md')).toBe('other\n');

  const ok = await server.request('PUT', '/file', {
    query: query({path: 'README.md'}),
    body: {contents: 'mine\n', expectedMtime: fresh.mtime},
  });
  expect(ok.status).toBe(200);
});

test('rejects a write whose body is not a string', async () => {
  const {status} = await server.request('PUT', '/file', {query: query({path: 'README.md'}), body: {contents: 5}});
  expect(status).toBe(400);
});

test('creates a file, including parent folders, and refuses to overwrite', async () => {
  const created = await server.request('POST', '/file', {query: query({path: 'deep/er/new.txt'}), body: {contents: 'hi'}});
  expect(created.status).toBe(200);
  expect(await project.read('deep/er/new.txt')).toBe('hi');

  const again = await server.request('POST', '/file', {query: query({path: 'deep/er/new.txt'}), body: {}});
  expect(again.status).toBe(409);
});

test('creates a directory', async () => {
  const {status} = await server.request('POST', '/directory', {query: query({path: 'lib/nested'})});
  expect(status).toBe(200);
  expect(await project.exists('lib/nested')).toBe(true);
});

test('renames and moves', async () => {
  const {status, json} = await server.request('POST', '/rename', {query: query({from: 'src/index.js', to: 'app/main.js'})});
  expect(status).toBe(200);
  expect(json).toEqual({from: 'src/index.js', to: 'app/main.js'});
  expect(await project.exists('src/index.js')).toBe(false);
  expect(await project.read('app/main.js')).toBe('console.log(1);\n');
});

test('rename refuses to clobber and to leave the project', async () => {
  const clobber = await server.request('POST', '/rename', {query: query({from: 'README.md', to: 'src/index.js'})});
  expect(clobber.status).toBe(409);

  const escape = await server.request('POST', '/rename', {query: query({from: 'README.md', to: '../out.md'})});
  expect(escape.status).toBe(400);
});

test('deletes files and whole folders, never the root', async () => {
  const file = await server.request('DELETE', '/file', {query: query({path: 'README.md'})});
  expect(file.status).toBe(200);
  expect(await project.exists('README.md')).toBe(false);

  const folder = await server.request('DELETE', '/file', {query: query({path: 'src'})});
  expect(folder.status).toBe(200);
  expect(await project.exists('src')).toBe(false);

  const root = await server.request('DELETE', '/file', {query: query({path: ''})});
  expect(root.status).toBe(400);
});

test('stat tells files from folders', async () => {
  const {json} = await server.request('GET', '/stat', {query: query({path: 'src'})});
  expect(json.isDirectory).toBe(true);
});
