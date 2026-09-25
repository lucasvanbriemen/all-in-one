import {HttpError, readJson, sendJson} from '../http.mjs';
import {replaceInFiles, searchCode} from '../search/codeSearch.mjs';

import {resolveTarget} from '../projectPaths.mjs';
import {searchFileNames} from '../search/fileSearch.mjs';

const SEARCH_OPTIONS = new Map([
  ['files', {name: 'files', run: searchFileNames}],
  ['code', {name: 'code', run: searchCode}],
]);

export async function search({response, searchParams}) {
  const {projectRoot} = resolveTarget(searchParams);
  const term = searchParams.get('term') ?? '';
  const type = searchParams.get('type') ?? 'files';
  const searching = SEARCH_OPTIONS.get(type);

  if (!searching) {
    throw new HttpError(400, `Unknown search type: ${type}`);
  }

  if (!term) {
    sendJson(response, {results: []});
    return;
  }

  const options = {
    caseSensitive: searchParams.get('caseSensitive') === 'true',
    regex: searchParams.get('regex') === 'true',
    wholeWord: searchParams.get('wholeWord') === 'true',
  };

  sendJson(response, {results: await searching.run(projectRoot, term, options)});
}

/**
 * Find and replace across the project. `paths`, when given, limits the write
 * to those files — the sidebar sends the ones the user left ticked.
 */
export async function replace({request, response, searchParams}) {
  const {projectRoot} = resolveTarget(searchParams);
  const body = await readJson(request);

  if (typeof body.term !== 'string' || !body.term) {
    throw new HttpError(400, 'term is required');
  }

  if (typeof body.replacement !== 'string') {
    throw new HttpError(400, 'replacement must be a string');
  }

  const result = await replaceInFiles(projectRoot, body.term, body.replacement, {
    caseSensitive: Boolean(body.caseSensitive),
    regex: Boolean(body.regex),
    wholeWord: Boolean(body.wholeWord),
    paths: Array.isArray(body.paths) ? body.paths : null,
  });

  sendJson(response, result);
}
