import {makeProject, startServer} from './helpers.mjs';

import {buildMatcher} from '../../scripts/fileserver/search/codeSearch.mjs';
import {fuzzyScore} from '../../scripts/fileserver/search/fileSearch.mjs';

let server;
let project;

beforeAll(async () => {
  server = await startServer();
});

afterAll(() => server.close());

beforeEach(async () => {
  project = await makeProject({
    'README.md': 'Hello world\nhello again\n',
    'src/components/Button.jsx': 'export function Button() { return null; }\n',
    'src/components/ButtonGroup.jsx': 'export function ButtonGroup() {}\n',
    'node_modules/pkg/index.js': 'Hello from a dependency\n',
    'image.png': 'Hello inside a png',
  });
});

afterEach(() => project.remove());

const query = (extra = {}) => ({projectRoot: project.root, ...extra});

test('file search ranks the file name match first and skips ignored folders', async () => {
  const {json} = await server.request('GET', '/search', {query: query({type: 'files', term: 'button'})});
  const paths = json.results.map(result => result.path);
  expect(paths[0]).toBe('src/components/Button.jsx');
  expect(paths).toContain('src/components/ButtonGroup.jsx');
  expect(paths.some(p => p.includes('node_modules'))).toBe(false);
});

test('file search is fuzzy across path segments', async () => {
  const {json} = await server.request('GET', '/search', {query: query({type: 'files', term: 'scbg'})});
  expect(json.results.map(result => result.path)).toContain('src/components/ButtonGroup.jsx');
});

test('code search returns line, column and preview, case-insensitively', async () => {
  const {json} = await server.request('GET', '/search', {query: query({type: 'code', term: 'hello'})});
  const readme = json.results.filter(result => result.path === 'README.md');
  expect(readme).toEqual([
    {path: 'README.md', line: 1, column: 1, length: 5, text: 'Hello world'},
    {path: 'README.md', line: 2, column: 1, length: 5, text: 'hello again'},
  ]);
  expect(json.results.some(result => result.path.endsWith('.png'))).toBe(false);
  expect(json.results.some(result => result.path.includes('node_modules'))).toBe(false);
});

test('code search honours case, whole word and regex flags', async () => {
  const sensitive = await server.request('GET', '/search', {query: query({type: 'code', term: 'Hello', caseSensitive: 'true'})});
  expect(sensitive.json.results.map(r => r.line)).toEqual([1]);

  const whole = await server.request('GET', '/search', {query: query({type: 'code', term: 'Button', wholeWord: 'true'})});
  expect(whole.json.results.map(r => r.path)).toEqual(['src/components/Button.jsx']);

  const regex = await server.request('GET', '/search', {query: query({type: 'code', term: 'Button(Group)?\\(\\)', regex: 'true'})});
  expect(regex.json.results).toHaveLength(2);
});

test('an unknown search type and an empty term are handled', async () => {
  const unknown = await server.request('GET', '/search', {query: query({type: 'nope', term: 'x'})});
  expect(unknown.status).toBe(400);

  const empty = await server.request('GET', '/search', {query: query({type: 'code', term: ''})});
  expect(empty.json.results).toEqual([]);
});

test('replace across the project, optionally limited to paths', async () => {
  const limited = await server.request('POST', '/replace', {
    query: query(),
    body: {term: 'hello', replacement: 'bye', paths: ['README.md']},
  });
  expect(limited.json).toEqual({changed: [{path: 'README.md', replacements: 2}], replacements: 2});
  expect(await project.read('README.md')).toBe('bye world\nbye again\n');

  const everywhere = await server.request('POST', '/replace', {
    query: query(),
    body: {term: 'Button', replacement: 'Knop', wholeWord: true},
  });
  expect(everywhere.json.replacements).toBe(1);
  expect(await project.read('src/components/Button.jsx')).toContain('function Knop()');
  expect(await project.read('src/components/ButtonGroup.jsx')).toContain('ButtonGroup');
});

test('regex replace expands capture groups', async () => {
  await server.request('POST', '/replace', {
    query: query(),
    body: {term: 'function (\\w+)', replacement: 'const $1 = function', regex: true, paths: ['src/components/Button.jsx']},
  });
  expect(await project.read('src/components/Button.jsx')).toContain('const Button = function()');
});

test('replace validates its body', async () => {
  const {status} = await server.request('POST', '/replace', {query: query(), body: {replacement: 'x'}});
  expect(status).toBe(400);
});

test('buildMatcher escapes plain terms', () => {
  expect('a.b'.match(buildMatcher('a.b'))).toEqual(['a.b']);
  expect('axb'.match(buildMatcher('a.b'))).toBeNull();
  expect('axb'.match(buildMatcher('a.b', {regex: true}))).toEqual(['axb']);
});

test('fuzzyScore prefers exact and prefix name matches', () => {
  expect(fuzzyScore('button.jsx', 'src/Button.jsx')).toBeGreaterThan(fuzzyScore('button', 'src/Button.jsx'));
  expect(fuzzyScore('but', 'src/Button.jsx')).toBeGreaterThan(fuzzyScore('but', 'src/but/other.js'));
  expect(fuzzyScore('zzz', 'src/Button.jsx')).toBe(0);
});
