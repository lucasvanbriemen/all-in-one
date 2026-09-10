import { listDirectory, readFile, writeFile } from './handlers/files.mjs';

import { search } from './handlers/search.mjs';

const routes = [
  { method: 'GET', path: '/file', handler: readFile },
  { method: 'PUT', path: '/file', handler: writeFile },
  { method: 'GET', path: '/files', handler: listDirectory },
  { method: 'GET', path: '/search', handler: search },
];

export function createRouter() {
  return async function handle(request, response) {
    const {pathname, searchParams} = new URL(request.url, 'http://localhost');
    const route = routes.find(
      candidate => candidate.method === request.method && candidate.path === pathname,
    );

    await route.handler({request, response, searchParams});
  };
}
