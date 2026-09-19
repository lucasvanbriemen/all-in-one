import {HttpError, sendError, sendJson} from './http.mjs';
import {VENDOR_PREFIX, importMap, serveVendor} from './handlers/vendor.mjs';
import * as git from './handlers/git.mjs';
import {
  createDirectory,
  createFile,
  deleteFile,
  listDirectory,
  readFile,
  renameFile,
  statFile,
  writeFile,
} from './handlers/files.mjs';
import {getState, patchState, putState} from './handlers/state.mjs';
import {replace, search} from './handlers/search.mjs';
import {languageServers} from '../lsp.mjs';

export const routes = [
  {method: 'GET', path: '/health', handler: health},
  {method: 'GET', path: '/file', handler: readFile},
  {method: 'PUT', path: '/file', handler: writeFile},
  {method: 'POST', path: '/file', handler: createFile},
  {method: 'DELETE', path: '/file', handler: deleteFile},
  {method: 'GET', path: '/stat', handler: statFile},
  {method: 'POST', path: '/directory', handler: createDirectory},
  {method: 'POST', path: '/rename', handler: renameFile},
  {method: 'GET', path: '/files', handler: listDirectory},
  {method: 'GET', path: '/search', handler: search},
  {method: 'POST', path: '/replace', handler: replace},
  {method: 'GET', path: '/state', handler: getState},
  {method: 'PUT', path: '/state', handler: putState},
  {method: 'PATCH', path: '/state', handler: patchState},
  {method: 'GET', path: '/git/status', handler: git.status},
  {method: 'GET', path: '/git/show', handler: git.show},
  {method: 'GET', path: '/git/diff', handler: git.diff},
  {method: 'GET', path: '/git/log', handler: git.log},
  {method: 'GET', path: '/git/branches', handler: git.branches},
  {method: 'POST', path: '/git/stage', handler: git.stage},
  {method: 'POST', path: '/git/unstage', handler: git.unstage},
  {method: 'POST', path: '/git/discard', handler: git.discard},
  {method: 'POST', path: '/git/commit', handler: git.commit},
  {method: 'POST', path: '/git/checkout', handler: git.checkout},
  {method: 'GET', path: '/import-map', handler: serveImportMap},
];

function health({response}) {
  sendJson(response, {
    ok: true,
    pid: process.pid,
    version: process.version,
    languageServers: languageServers(),
  });
}

function serveImportMap({request, response}) {
  const base = `http://${request.headers.host ?? '127.0.0.1:4001'}`;
  sendJson(response, importMap(base));
}

export function createRouter() {
  return async function handle(request, response) {
    const {pathname, searchParams} = new URL(request.url, 'http://localhost');

    try {
      if (pathname.startsWith(VENDOR_PREFIX)) {
        serveVendor({request, response, pathname});
        return;
      }

      const route = routes.find(
        candidate => candidate.method === request.method && candidate.path === pathname,
      );

      if (!route) {
        throw new HttpError(404, `No route for ${request.method} ${pathname}`);
      }

      await route.handler({request, response, searchParams, pathname});
    } catch (error) {
      if (response.headersSent) {
        response.end();
        return;
      }

      if (error instanceof HttpError) {
        sendError(response, error.status, error.message);
        return;
      }

      if (error?.code === 'ENOENT') {
        sendError(response, 404, error.message);
        return;
      }

      if (error?.code === 'EISDIR' || error?.code === 'ENOTDIR' || error?.code === 'EEXIST') {
        sendError(response, 400, error.message);
        return;
      }

      console.error(`${request.method} ${pathname} failed:`, error);
      sendError(response, 500, error?.message ?? 'Internal error');
    }
  };
}
