import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

/**
 * The folder every path in a request is relative to.
 *
 * Chosen at runtime rather than compiled in: the app asks for it over `/root`
 * and replaces it over `PUT /root` once the user picks a folder in the native
 * panel. The argument and the environment variable are for launching the
 * server straight at a project without going through the UI.
 */
let root = path.resolve(process.argv[2] ?? process.env.ROOT ?? os.homedir());

const server = http.createServer(async (request, response) => {
  const { method, url } = request;
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const relative = searchParams.get('path');

  if (pathname === '/root') {
    if (method === 'GET') {
      return sendJson(response, 200, { root });
    }

    if (method === 'PUT') {
      return setRoot(request, response);
    }
  }

  if (method == "PUT" && pathname === "/file") {
    const wantedPath = relative || '';
    const absolute = path.resolve(root, wantedPath);

    let body;

    try {
      body = (await readBody(request)).contents;
    } catch (error) {
      console.error(`Failed to parse request body; error: ${error}`);
      return sendJson(response, 400, { error: 'invalid request body' });
    }

    if (!isInsideRoot(absolute)) {
      return sendJson(response, 400, { error: 'invalid path parameter' });
    }

    try {
      await fs.writeFile(absolute, body, 'utf8');
      return sendJson(response, 200, { path: wantedPath });
    } catch (error) {
      console.error(`Failed to write file: ${absolute}; error: ${error}`);
      return sendJson(response, 500, { error: 'failed to write file' });
    }
  }

  if (method !== 'GET' || (pathname !== '/file' && pathname !== '/files')) {
    return sendJson(response, 404, { error: 'not found' });
  }

  if (!relative && pathname === '/file') {
    return sendJson(response, 400, { error: 'missing path parameter' });
  }

  const wantedPath = relative || '';

  if (wantedPath.includes('..')) {
    return sendJson(response, 400, { error: 'invalid path parameter' });
  }

  if (wantedPath.startsWith('/') && pathname === '/file') {
    return sendJson(response, 400, { error: 'invalid path parameter' });
  }

  const absolute = path.resolve(root, wantedPath);

  if (!isInsideRoot(absolute)) {
    return sendJson(response, 400, { error: 'invalid path parameter' });
  }

  if (pathname === '/file') {
    return getFileContents(absolute, response, wantedPath);
  } else if (pathname === '/files') {
    return getDirectoryContents(absolute, response, wantedPath);
  }
});

server.listen(4001, '127.0.0.1', () => {
  console.log(`listening on http://127.0.0.1:4001, serving ${root}`);
});

/**
 * `absolute.startsWith(root)` is not a path test — with a root of
 * `/code/app` it also accepts `/code/app-secrets`. It mattered little while
 * the root was a constant; now that the user picks it, the containment check
 * has to be a real one.
 */
function isInsideRoot(absolute) {
  const inside = path.relative(root, absolute);

  return inside === '' || (!inside.startsWith('..') && !path.isAbsolute(inside));
}

async function setRoot(request, response) {
  let wanted;

  try {
    wanted = (await readBody(request)).root;
  } catch (error) {
    console.error(`Failed to parse request body; error: ${error}`);
    return sendJson(response, 400, { error: 'invalid request body' });
  }

  if (typeof wanted !== 'string' || !path.isAbsolute(wanted)) {
    return sendJson(response, 400, { error: 'root must be an absolute path' });
  }

  // `resolve` also drops the trailing slash AppKit puts on directory paths,
  // which would otherwise show up in every `path.relative` comparison.
  const absolute = path.resolve(wanted);

  try {
    const stats = await fs.stat(absolute);

    if (!stats.isDirectory()) {
      return sendJson(response, 400, { error: 'root is not a directory' });
    }
  } catch (error) {
    console.error(`Failed to open root: ${absolute}; error: ${error}`);
    return sendJson(response, 400, { error: 'no such directory' });
  }

  root = absolute;
  console.log(`serving ${root}`);

  return sendJson(response, 200, { root });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', chunk => {
      body += chunk.toString();
    });
    request.on('error', reject);
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

async function getFileContents(absolutePath, response, wantedPath) {
  try {
    const contents = await fs.readFile(absolutePath, 'utf8');
    sendJson(response, 200, { path: wantedPath, contents });
  } catch (error) {
    console.error(`Failed to read file: ${absolutePath}; error: ${error}`);
    sendJson(response, 404, { error: 'not found' });
  }
}

async function getDirectoryContents(absolutePath, response, wantedPath) {
  try {
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    const contents = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      fullPath: path.join(wantedPath, entry.name),
    }));
    sendJson(response, 200, { path: wantedPath, contents });
  } catch (error) {
    console.error(`Failed to read directory: ${absolutePath}; error: ${error}`);
    sendJson(response, 404, { error: 'not found' });
  }
}
