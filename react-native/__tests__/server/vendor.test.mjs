import {startServer} from './helpers.mjs';

let server;

beforeAll(async () => {
  server = await startServer();
});

afterAll(() => server.close());

test('serves Monaco and xterm from node_modules with the right types', async () => {
  const loader = await server.request('GET', '/vendor/monaco-editor/min/vs/loader.js');
  expect(loader.status).toBe(200);
  expect(loader.headers.get('content-type')).toBe('text/javascript');
  expect(loader.text).toContain('require');

  const css = await server.request('GET', '/vendor/@xterm/xterm/css/xterm.css');
  expect(css.status).toBe(200);
  expect(css.headers.get('content-type')).toBe('text/css');
});

test('resolves package exports for bare subpaths', async () => {
  const lang = await server.request('GET', '/vendor/@shikijs/langs/tsx');
  expect(lang.status).toBe(200);
  expect(lang.headers.get('content-type')).toBe('text/javascript');
});

test('refuses packages that are not vendored and paths that escape', async () => {
  const other = await server.request('GET', '/vendor/react-native/package.json');
  expect(other.status).toBe(404);

  const escape = await server.request('GET', '/vendor/monaco-editor/..%2F..%2Fpackage.json');
  expect([400, 404]).toContain(escape.status);
});

test('the import map covers every shiki package with absolute URLs', async () => {
  const {json} = await server.request('GET', '/import-map');
  expect(json.imports.shiki).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/vendor\/shiki\/dist\/.+\.mjs$/);
  expect(json.imports['@shikijs/core']).toMatch(/\/vendor\/@shikijs\/core\//);
  expect(json.imports['@shikijs/langs/']).toMatch(/\/vendor\/@shikijs\/langs\/$/);
});

test('a bare package name serves its entry point', async () => {
  const bare = await server.request('GET', '/vendor/shiki');
  expect(bare.status).toBe(200);
  expect(bare.headers.get('content-type')).toBe('text/javascript');
});
