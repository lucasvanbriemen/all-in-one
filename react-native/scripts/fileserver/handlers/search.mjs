import {searchCode} from '../search/codeSearch.mjs';
import {searchFileNames} from '../search/fileSearch.mjs';
import {sendJson} from '../http.mjs';

const SEARCH_OPTIONS = new Map([
  ['files', {name: 'files', run: searchFileNames}],
  ['code', {name: 'code', run: searchCode}],
]);

export async function search({response, searchParams}) {
  const projectRoot = searchParams.get('projectRoot');
  const term = searchParams.get('term');

  const searching = SEARCH_OPTIONS.get(searchParams.get('type'));

  sendJson(response, {results: await searching.run(projectRoot, term)});
}
