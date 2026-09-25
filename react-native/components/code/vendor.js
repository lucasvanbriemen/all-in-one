import {MONACO_CDN, SHIKI_CDN, SHIKI_MONACO_CDN} from '../monacoTheme';
import {XTERM_CDN, XTERM_FIT_CDN} from './terminalTheme';

import {fileSystem} from '../fileSystem';

/**
 * Where the two WebViews load Monaco, xterm and Shiki from.
 *
 * With the file server up they come off it, from the copies in `node_modules`
 * (or the bundle's own, see `stage-sidecar.sh`), so the editor boots with no
 * network and no CDN in the loop. Without it the CDNs are the fallback — the
 * page can still show its "server is down" state in a working editor.
 */
export const CDN_SOURCES = {
  local: false,
  base: MONACO_CDN,
  monaco: MONACO_CDN,
  xterm: XTERM_CDN,
  xtermFit: XTERM_FIT_CDN,
  shiki: SHIKI_CDN,
  shikiMonaco: SHIKI_MONACO_CDN,
  importMap: null,
};

export function localSources(importMap) {
  return {
    local: true,
    base: `${fileSystem.vendorUrl('monaco-editor', 'min')}`,
    monaco: fileSystem.vendorUrl('monaco-editor', 'min'),
    xterm: fileSystem.vendorUrl('@xterm/xterm'),
    xtermFit: fileSystem.vendorUrl('@xterm/addon-fit'),
    shiki: importMap?.imports?.shiki ?? SHIKI_CDN,
    shikiMonaco: importMap?.imports?.['@shikijs/monaco'] ?? SHIKI_MONACO_CDN,
    importMap,
  };
}

let pending = null;

/**
 * One probe per launch. Resolved rather than assumed, because a page that
 * bakes the local URLs into its document and then finds the server down has
 * nothing to fall back to — the document is built exactly once.
 */
export function resolveVendorSources({force = false} = {}) {
  if (pending && !force) {
    return pending;
  }

  pending = fileSystem
    .importMap()
    .then(importMap => localSources(importMap))
    .catch(() => CDN_SOURCES);

  return pending;
}
