/* eslint-disable no-new-func */
import {CDN_SOURCES, localSources} from '../components/code/vendor';

import {terminalHtml} from '../components/code/Terminal';

function scriptOf(html) {
  const start = html.lastIndexOf('<script>') + '<script>'.length;
  const end = html.lastIndexOf('</script>');
  return html.slice(start, end);
}

test('the terminal page script parses, with either source set', () => {
  for (const sources of [CDN_SOURCES, localSources(null)]) {
    const html = terminalHtml({background: '#000'}, sources);
    expect(() => new Function(scriptOf(html))).not.toThrow();
    expect(html).toContain(`${sources.xterm}/css/xterm.css`);
  }
});
