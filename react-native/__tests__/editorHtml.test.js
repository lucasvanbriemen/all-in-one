/* eslint-disable no-new-func */
import {CDN_SOURCES, localSources} from '../components/code/vendor';
import {editorHtml, editorOptions} from '../components/CodeEditor';

function scriptOf(html) {
  const start = html.lastIndexOf('<script>') + '<script>'.length;
  const end = html.lastIndexOf('</script>');
  return html.slice(start, end);
}

test('the page script is valid JavaScript with CDN sources', () => {
  const html = editorHtml({path: 'a.js', value: 'x', language: null, projectRoot: '/p'}, CDN_SOURCES);
  expect(() => new Function(scriptOf(html))).not.toThrow();
  expect(html).not.toContain('importmap');
});

test('the page script is valid with local sources and carries the import map', () => {
  const sources = localSources({imports: {shiki: 'http://127.0.0.1:4001/vendor/shiki/dist/index.mjs'}});
  const html = editorHtml({path: null, value: '', language: null, projectRoot: null}, sources);
  expect(() => new Function(scriptOf(html))).not.toThrow();
  expect(html).toContain('<script type="importmap">');
  expect(html).toContain('127.0.0.1:4001/vendor/monaco-editor/min');
});

test('editor options map settings onto Monaco', () => {
  expect(editorOptions({fontSize: 16, wordWrap: true, minimap: true, tabSize: 4})).toMatchObject({
    fontSize: 16, wordWrap: 'on', minimap: {enabled: true}, tabSize: 4,
  });
  expect(editorOptions({}).wordWrap).toBe('off');
});
