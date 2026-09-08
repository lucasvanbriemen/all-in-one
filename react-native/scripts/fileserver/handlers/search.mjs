import {sendError, sendJson} from '../http.mjs';
import {searchCode} from '../search/codeSearch.mjs';
import {searchFileNames} from '../search/fileSearch.mjs';

/**
 * The two searches, by the `type` the client asks for. Anything else is taken
 * as a code search, which is what the client's own default relies on.
 */
const SEARCHES = new Map([
  ['files', {name: 'files', run: searchFileNames}],
  ['code', {name: 'code', run: searchCode}],
]);

const DEFAULT_SEARCH = SEARCHES.get('code');

/**
 * GET /search?projectRoot=…&term=…&type=files|code
 *
 * Two searches behind one endpoint, because the editor offers them as two
 * modes of a single modal. `files` answers with paths, `code` with positions.
 */
export async function search({response, searchParams}) {
  const projectRoot = searchParams.get('projectRoot');
  const term = searchParams.get('term');

  if (!term) {
    sendError(response, 400, 'missing term parameter');
    return;
  }

  if (!projectRoot) {
    sendError(response, 400, 'missing projectRoot parameter');
    return;
  }

  // A Map rather than an object literal, so that a `type` of `constructor` or
  // `__proto__` is a miss like any other unrecognised value.
  const searching = SEARCHES.get(searchParams.get('type')) || DEFAULT_SEARCH;

  try {
    sendJson(response, 200, {results: await searching.run(projectRoot, term)});
  } catch (error) {
    console.error(`Failed to search ${searching.name} in: ${projectRoot}; error: ${error}`);
    sendError(response, 500, `failed to search ${searching.name}`);
  }
}
