import {HttpError} from '../http.mjs';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The editor's browser-side libraries, served off this port so the Code page
 * works with no network at all. Only the packages the two WebViews load are
 * exposed, each pinned to the directory it is installed in — the server never
 * hands out an arbitrary `node_modules` path.
 *
 * In the bundled app these live beside the server (see `stage-sidecar.sh`);
 * in development they are the project's own `node_modules`.
 */
const PACKAGES = [
  'monaco-editor',
  '@xterm/xterm',
  '@xterm/addon-fit',
  'shiki',
  '@shikijs/core',
  '@shikijs/engine-javascript',
  '@shikijs/engine-oniguruma',
  '@shikijs/langs',
  '@shikijs/monaco',
  '@shikijs/themes',
  '@shikijs/types',
  '@shikijs/vscode-textmate',
];

const TYPES = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.cjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.html': 'text/html',
  '.map': 'application/json',
};

export const VENDOR_PREFIX = '/vendor/';

/**
 * `node_modules` beside the entry point — which is `scripts/fileserver.mjs`
 * in development, so one level up, and the bundle's own root in the app — or
 * beside the working directory.
 */
export function findNodeModules() {
  const entry = process.argv[1] ? path.dirname(path.resolve(process.argv[1])) : process.cwd();
  const candidates = [
    process.env.AIO_NODE_MODULES,
    path.join(entry, 'node_modules'),
    path.join(entry, '..', 'node_modules'),
    path.join(process.cwd(), 'node_modules'),
  ].filter(Boolean);

  return candidates.find(candidate => fs.existsSync(path.join(candidate, 'monaco-editor'))) ?? candidates[candidates.length - 1];
}

/**
 * The import map the Shiki ESM bundle needs: its packages import each other by
 * bare name, and a browser resolves those only through a map. Built here so the
 * document and the server agree on the URLs.
 */
export function importMap(base) {
  const imports = {};

  for (const name of PACKAGES) {
    const packageJson = readPackage(name);

    if (!packageJson) {
      continue;
    }

    const main = packageEntry(packageJson);

    if (main) {
      imports[name] = `${base}${VENDOR_PREFIX}${name}/${main}`;
    }

    imports[`${name}/`] = `${base}${VENDOR_PREFIX}${name}/`;
  }

  return {imports};
}

function readPackage(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(findNodeModules(), name, 'package.json'), 'utf8'));
  } catch (error) {
    return null;
  }
}

function packageEntry(packageJson) {
  const exports = packageJson.exports?.['.'];
  const pick = value => {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    return pick(value.import) ?? pick(value.default) ?? pick(value.browser);
  };

  return (pick(exports) ?? packageJson.module ?? packageJson.main ?? 'index.js').replace(/^\.\//, '');
}

/** `@shikijs/langs/tsx` -> `@shikijs/langs/dist/tsx.mjs`, via the package's `exports`. */
function resolveSubpath(name, rest) {
  const packageJson = readPackage(name);
  const exports = packageJson?.exports;

  if (!exports || !rest) {
    return rest;
  }

  const key = `./${rest}`;

  if (exports[key]) {
    return pickEntry(exports[key]);
  }

  for (const [pattern, target] of Object.entries(exports)) {
    if (!pattern.includes('*')) {
      continue;
    }

    const [prefix, suffix] = pattern.split('*');
    if (key.startsWith(prefix) && key.endsWith(suffix)) {
      const wildcard = key.slice(prefix.length, key.length - suffix.length);
      const resolved = pickEntry(target);
      return resolved ? resolved.replace('*', wildcard) : rest;
    }
  }

  return rest;
}

function pickEntry(value) {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value.replace(/^\.\//, '');
  }
  return pickEntry(value.import) ?? pickEntry(value.default) ?? pickEntry(value.browser);
}

export function serveVendor({request, response, pathname}) {
  const relative = decodeURIComponent(pathname.slice(VENDOR_PREFIX.length));
  const name = PACKAGES.find(candidate => relative === candidate || relative.startsWith(`${candidate}/`));

  if (!name) {
    throw new HttpError(404, `Not a vendored package: ${relative}`);
  }

  const root = path.join(findNodeModules(), name);
  // The bare package name is its entry point, as the import map says.
  const rest = relative.slice(name.length + 1) || packageEntry(readPackage(name) ?? {});
  let absolute = path.resolve(root, rest);

  if (!absolute.startsWith(root + path.sep) && absolute !== root) {
    throw new HttpError(400, 'Path escapes the package');
  }

  if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) {
    const viaExports = resolveSubpath(name, rest);
    absolute = path.resolve(root, viaExports ?? '');

    if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) {
      throw new HttpError(404, `Not found: ${relative}`);
    }
  }

  const type = TYPES[path.extname(absolute).toLowerCase()] ?? 'application/octet-stream';

  response.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  fs.createReadStream(absolute).pipe(response);
}
