import {listDirectory, readFile, writeFile} from './handlers/files.mjs';

import {search} from './handlers/search.mjs';

export const routes = [
  {method: 'GET', path: '/file', handler: readFile},
  {method: 'PUT', path: '/file', handler: writeFile},
  {method: 'GET', path: '/files', handler: listDirectory},
  {method: 'GET', path: '/search', handler: search},
];
