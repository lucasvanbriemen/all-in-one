import {listDirectory, readFile, writeFile} from './handlers/files.mjs';
import {search} from './handlers/search.mjs';

/**
 * Everything this server answers, in one place.
 *
 * `createRouter` matches a request against this table and against nothing
 * else, so an endpoint absent from here does not exist: it is a 404 rather
 * than a fall-through into some other route's handler.
 */
export const routes = [
  {method: 'GET', path: '/file', handler: readFile},
  {method: 'PUT', path: '/file', handler: writeFile},
  {method: 'GET', path: '/files', handler: listDirectory},
  {method: 'GET', path: '/search', handler: search},
];
