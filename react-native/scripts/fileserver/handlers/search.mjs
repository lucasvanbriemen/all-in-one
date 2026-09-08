import {searchCode} from '../search/codeSearch.mjs';
import {searchFileNames} from '../search/fileSearch.mjs';
import {sendJson} from '../http.mjs';

const SEARCHES = new Map([
  ['files', {name: 'files', run: searchFileNames}],
  ['code', {name: 'code', run: searchCode}],
]);

const DEFAULT_SEARCH = SEARCHES.get('code');

export async function search({response, searchParams}) {
  const projectRoot = searchParams.get('projectRoot');
  const term = searchParams.get('term');

  const searching = SEARCHES.get(searchParams.get('type')) || DEFAULT_SEARCH;

  sendJson(response, 200, {results: await searching.run(projectRoot, term)});
}
