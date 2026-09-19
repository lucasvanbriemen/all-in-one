import {createRouter} from '../../scripts/fileserver/router.mjs';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

/**
 * The router on a random port, against a throwaway project directory. Every
 * test gets its own so they can run in parallel and leave nothing behind.
 */
export async function startServer() {
  const server = http.createServer(createRouter());

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  const {port} = server.address();
  const base = `http://127.0.0.1:${port}`;

  return {
    base,
    close: () => new Promise(resolve => server.close(resolve)),
    async request(method, route, {query = {}, body} = {}) {
      const url = new URL(route, base);

      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }

      const response = await fetch(url, {
        method,
        headers: body !== undefined ? {'Content-Type': 'application/json'} : {},
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const text = await response.text();
      let json = null;

      try {
        json = JSON.parse(text);
      } catch (error) {
        json = null;
      }

      return {status: response.status, json, text, headers: response.headers};
    },
  };
}

export async function makeProject(files = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aio-editor-test-'));

  for (const [relative, contents] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    await fs.mkdir(path.dirname(absolute), {recursive: true});
    await fs.writeFile(absolute, contents, 'utf8');
  }

  return {
    root,
    read: relative => fs.readFile(path.join(root, relative), 'utf8'),
    exists: relative => fs.access(path.join(root, relative)).then(() => true, () => false),
    remove: () => fs.rm(root, {recursive: true, force: true}),
  };
}
