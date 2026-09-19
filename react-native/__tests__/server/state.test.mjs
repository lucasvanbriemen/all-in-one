import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Read at module load by the state handler, so it has to be set before the
// import below is evaluated — which hoisting would defeat. `require` it is.
process.env.AIO_STATE_DIR = require('node:fs').mkdtempSync(path.join(os.tmpdir(), 'aio-state-'));
const {startServer} = require('./helpers.mjs');

let server;

beforeAll(async () => {
  server = await startServer();
});

afterAll(async () => {
  await server.close();
  await fs.rm(process.env.AIO_STATE_DIR, {recursive: true, force: true});
});

test('state starts empty, round-trips, and patches', async () => {
  const empty = await server.request('GET', '/state');
  expect(empty.json).toEqual({});

  await server.request('PUT', '/state', {body: {recentProjects: ['/a'], settings: {fontSize: 14}}});
  const stored = await server.request('GET', '/state');
  expect(stored.json).toEqual({recentProjects: ['/a'], settings: {fontSize: 14}});

  const patched = await server.request('PATCH', '/state', {body: {settings: {fontSize: 16}}});
  expect(patched.json).toEqual({recentProjects: ['/a'], settings: {fontSize: 16}});

  const onDisk = JSON.parse(await fs.readFile(path.join(process.env.AIO_STATE_DIR, 'editor-state.json'), 'utf8'));
  expect(onDisk.settings.fontSize).toBe(16);
});

test('a body that is not JSON is a 400', async () => {
  const response = await fetch(`${server.base}/state`, {method: 'PUT', body: 'not json'});
  expect(response.status).toBe(400);
});
