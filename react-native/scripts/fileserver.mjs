import {attachTerminal} from './terminal.mjs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

/**
 * Every path in a request is relative to the project the editor has open, and
 * this is the only thing standing between that and the rest of the disk.
 * `startsWith` alone does not do it — `/repo-backup` starts with `/repo` — so
 * containment is decided on whole path segments, which is what `path.relative`
 * reports: anything outside the root comes back leading with `..`.
 *
 * Returns null when the path escapes, so every caller can answer 400 the same
 * way rather than repeating the reasoning.
 */
function resolveWithin(projectRoot, relative) {
  if (!projectRoot) {
    return null;
  }

  const absolute = path.resolve(projectRoot, relative || '');
  const inside = path.relative(projectRoot, absolute);

  if (inside.startsWith('..') || path.isAbsolute(inside)) {
    return null;
  }

  return absolute;
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk.toString();
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

async function exists(absolutePath) {
  try {
    await fs.access(absolutePath);
    return true;
  } catch (error) {
    return false;
  }
}

const server = http.createServer(async (request, response) => {
  const { method, url } = request;
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const relative = searchParams.get('path');
  const projectRoot = searchParams.get('projectRoot');

  if (method == "GET" && pathname === "/search") {
    const searchTerm = searchParams.get('term');
    const searchingFor = searchParams.get('type');
    if (!searchTerm) {
      return sendJson(response, 400, { error: 'missing term parameter' });
    }

    if (searchingFor == 'files') {
      return searchFiles(response, projectRoot, searchTerm);
    } else {
      return searchCode(response, projectRoot, searchTerm);
    }
  }

  // Create, rename and delete all address a single entry and all answer the
  // same two shapes, so they share a route and differ only by verb. Unlike
  // `/file` they make no distinction between a file and a folder: the tree
  // manipulates both, and which one it is comes from the body or the disk.
  if (pathname === '/entry') {
    if (method === 'POST') {
      return createEntry(request, response, projectRoot, relative);
    }

    if (method === 'PATCH') {
      return renameEntry(request, response, projectRoot, relative);
    }

    if (method === 'DELETE') {
      return deleteEntry(response, projectRoot, relative);
    }
  }

  if (method == "PUT" && pathname === "/file") {
    return writeFileContents(request, response, projectRoot, relative);
  }

  if (method !== 'GET' || (pathname !== '/file' && pathname !== '/files')) {
    return sendJson(response, 404, { error: 'not found' });
  }

  if (!relative && pathname === '/file') {
    return sendJson(response, 400, { error: 'missing path parameter' });
  }

  const wantedPath = relative || '';
  const absolute = resolveWithin(projectRoot, wantedPath);

  if (!absolute) {
    return sendJson(response, 400, { error: 'invalid path parameter' });
  }

  if (pathname === '/file') {
    return getFileContents(absolute, response, wantedPath);
  }

  return getDirectoryContents(absolute, response, wantedPath);
});

async function writeFileContents(request, response, projectRoot, relative) {
  const wantedPath = relative || '';
  const absolute = resolveWithin(projectRoot, wantedPath);

  if (!absolute) {
    return sendJson(response, 400, { error: 'invalid path parameter' });
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    console.error(`Failed to parse request body for: ${absolute}; error: ${error}`);
    return sendJson(response, 400, { error: 'invalid request body' });
  }

  try {
    await fs.writeFile(absolute, body.contents, 'utf8');
    sendJson(response, 200, { path: wantedPath });
  } catch (error) {
    console.error(`Failed to write file: ${absolute}; error: ${error}`);
    sendJson(response, 500, { error: 'failed to write file' });
  }
}

/**
 * Creating is allowed to create the folders above it too: VS Code's explorer
 * takes `app/models/user.rb` in its new-file field and makes the whole path,
 * and the tree here offers the same thing rather than one level at a time.
 */
async function createEntry(request, response, projectRoot, relative) {
  const absolute = resolveWithin(projectRoot, relative);

  if (!absolute || !relative || absolute === path.resolve(projectRoot)) {
    return sendJson(response, 400, { error: 'invalid path parameter' });
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return sendJson(response, 400, { error: 'invalid request body' });
  }

  const isDirectory = body.type === 'directory';

  if (await exists(absolute)) {
    return sendJson(response, 409, { error: `${path.basename(absolute)} already exists` });
  }

  try {
    await fs.mkdir(isDirectory ? absolute : path.dirname(absolute), { recursive: true });

    if (!isDirectory) {
      // `wx` rather than a plain write, because the existence check above is
      // not the same instant as this: two racing creates must not let the
      // loser blank the file the winner just made.
      await fs.writeFile(absolute, '', { encoding: 'utf8', flag: 'wx' });
    }

    sendJson(response, 200, { path: relative, isDirectory });
  } catch (error) {
    console.error(`Failed to create entry: ${absolute}; error: ${error}`);
    sendJson(response, 500, { error: 'failed to create entry' });
  }
}

/**
 * Rename and move are the same operation seen from different angles — the tree
 * only edits the last segment, but nothing here needs to care, so a `newPath`
 * that lands somewhere else entirely works and drags the folders into place.
 */
async function renameEntry(request, response, projectRoot, relative) {
  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return sendJson(response, 400, { error: 'invalid request body' });
  }

  const from = resolveWithin(projectRoot, relative);
  const to = resolveWithin(projectRoot, body.newPath);
  const root = path.resolve(projectRoot);

  if (!from || !to || !relative || !body.newPath || from === root || to === root) {
    return sendJson(response, 400, { error: 'invalid path parameter' });
  }

  // On a case-insensitive volume — which is every default-formatted Mac —
  // `README.md` already "exists" when the target is `readme.md`. But that is
  // the very rename being asked for, and refusing it would make capitalisation
  // the one edit the tree cannot make.
  const isCaseOnlyRename = from.toLowerCase() === to.toLowerCase();

  if (!isCaseOnlyRename && await exists(to)) {
    return sendJson(response, 409, { error: `${path.basename(to)} already exists` });
  }

  try {
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.rename(from, to);
    sendJson(response, 200, { path: body.newPath });
  } catch (error) {
    console.error(`Failed to rename: ${from} -> ${to}; error: ${error}`);
    sendJson(response, 500, { error: 'failed to rename entry' });
  }
}

/**
 * There is no trash to move to from Node, so this is permanent — which is why
 * the tree asks before calling it, rather than offering an undo it cannot honour.
 */
async function deleteEntry(response, projectRoot, relative) {
  const absolute = resolveWithin(projectRoot, relative);

  if (!absolute || !relative || absolute === path.resolve(projectRoot)) {
    return sendJson(response, 400, { error: 'invalid path parameter' });
  }

  try {
    await fs.rm(absolute, { recursive: true, force: true });
    sendJson(response, 200, { path: relative });
  } catch (error) {
    console.error(`Failed to delete: ${absolute}; error: ${error}`);
    sendJson(response, 500, { error: 'failed to delete entry' });
  }
}

// The editor's shell, on the same port: `ws://127.0.0.1:4001/terminal`.
attachTerminal(server);

/**
 * When the macOS app spawns this server it hands it a pipe on stdin and holds
 * the other end open for its own lifetime (see `SidecarServer.m`). A crash or a
 * `kill -9` skips every shutdown path the app could run, but it cannot keep a
 * pipe open, so EOF here means the app is gone and this process is orphaned —
 * and an orphan still holding port 4001 would lock out the next launch.
 *
 * Only the app sets this; started from the Procfile the server keeps whatever
 * stdin the shell gave it and outlives nothing.
 */
/**
 * Two things want to own this port: the copy started from the Procfile during
 * development, and the copy the packaged .app spawns out of its own bundle.
 * Only one can bind, and whichever loses is redundant rather than broken — the
 * editor talks to a port, not to a particular process, so the survivor serves
 * both. Standing down is therefore the correct outcome, not a failure.
 */
server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.log('port 4001 already served; deferring to the running server');
    process.exit(0);
  }
  throw error;
});

if (process.env.AIO_EXIT_ON_STDIN_EOF === '1') {
  process.stdin.on('end', () => process.exit(0));
  process.stdin.resume();
}

server.listen(4001, '127.0.0.1', () => {
  console.log('listening on http://127.0.0.1:4001');
});

async function getFileContents(absolutePath, response, wantedPath) {
  try {
    const contents = await fs.readFile(absolutePath, 'utf8');
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ path: wantedPath, contents }));
  } catch (error) {
    console.error(`Failed to read file: ${absolutePath}; error: ${error}`);
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
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
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ path: wantedPath, contents }));
  } catch (error) {
    console.error(`Failed to read directory: ${absolutePath}; error: ${error}`);
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
  }
}

async function searchFiles(response, projectRoot, searchTerm) {
  try {
    const results = [];
    await searchDirectory(projectRoot, searchTerm, results);

    let formattedResults = results.map(result => path.relative(projectRoot, result));
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ results: formattedResults }));
  } catch (error) {
    console.error(`Failed to search files in: ${projectRoot}; error: ${error}`);
    response.writeHead(500, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'failed to search files' }));
  }
}

/**
 * Both searches walk the same tree, so they skip the same folders: the ones
 * whose contents are generated, vendored, or the repository's own bookkeeping.
 */
const FoldersToIgnore = ['node_modules', '.git', 'build', 'dist', 'out', 'venv', '__pycache__'];

/**
 * Reading a binary as utf8 costs exactly what reading source costs and can only
 * produce hits nobody wants to open, so the common ones are turned away on
 * their extension before the file is ever opened. A file with no extension —
 * `Makefile`, `.gitignore`, a shell script — is source until proven otherwise,
 * and the NUL check below is what proves it.
 */
const ExtensionsToIgnore = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.icns', '.svgz',
  '.pdf', '.zip', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.jar', '.tar',
  '.mp3', '.mp4', '.mov', '.avi', '.wav', '.webm', '.ogg',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.so', '.dylib', '.dll', '.exe', '.o', '.a', '.class', '.pyc', '.wasm',
  '.db', '.sqlite', '.sqlite3', '.lock', '.map',
]);

/**
 * Three separate budgets, because they stop three different things going wrong.
 * The total is what the modal can show before the list stops being a list; the
 * per-file cap keeps one generated file from spending that whole total on
 * itself; and the size cap steps around minified bundles, which are a single
 * multi-megabyte line and therefore all cost and no answer.
 */
const MAX_CODE_RESULTS = 200;
const MAX_MATCHES_PER_FILE = 20;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PREVIEW_LENGTH = 400;

/**
 * Unlike `searchFiles`, which answers with paths, this answers with positions:
 * every hit carries the line and column it was found at, so the editor can open
 * the file *and* put the caret on the match rather than at the top.
 */
async function searchCode(response, projectRoot, searchTerm) {
  try {
    const results = [];
    await searchCodeInDirectory(projectRoot, searchTerm.toLowerCase(), projectRoot, results);

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ results }));
  } catch (error) {
    console.error(`Failed to search code in: ${projectRoot}; error: ${error}`);
    response.writeHead(500, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'failed to search code' }));
  }
}

async function searchCodeInDirectory(directory, searchTermLower, projectRoot, results) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    // A directory we are not allowed to open is a directory with no matches in
    // it; one unreadable folder should not fail the whole search.
    console.error(`Skipping unreadable directory: ${directory}; error: ${error}`);
    return;
  }

  for (const entry of entries) {
    if (results.length >= MAX_CODE_RESULTS) {
      return;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!FoldersToIgnore.includes(entry.name)) {
        await searchCodeInDirectory(fullPath, searchTermLower, projectRoot, results);
      }
      continue;
    }

    // Symlinks are deliberately not followed: they are the one entry that can
    // point back up the tree and turn this walk into a loop.
    if (!entry.isFile()) {
      continue;
    }

    if (ExtensionsToIgnore.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    await searchCodeInFile(fullPath, searchTermLower, projectRoot, results);
  }
}

async function searchCodeInFile(absolutePath, searchTermLower, projectRoot, results) {
  let contents;
  try {
    const stats = await fs.stat(absolutePath);
    if (stats.size > MAX_FILE_BYTES) {
      return;
    }
    contents = await fs.readFile(absolutePath, 'utf8');
  } catch (error) {
    // Same bargain as above: an unreadable file is a file without matches.
    return;
  }

  // What the extension list missed. Text files do not contain NUL; binaries
  // read as utf8 almost always do, within the first few hundred bytes.
  if (contents.includes('\u0000')) {
    return;
  }

  const relative = path.relative(projectRoot, absolutePath);
  const lines = contents.split('\n');
  let matchesInFile = 0;

  for (let index = 0; index < lines.length; index++) {
    if (matchesInFile >= MAX_MATCHES_PER_FILE || results.length >= MAX_CODE_RESULTS) {
      return;
    }

    // Only the first hit on a line is reported. A second one on the same line
    // is the same line to open, and the modal would show the row twice.
    const line = lines[index].replace(/\r$/, '');
    const column = line.toLowerCase().indexOf(searchTermLower);
    if (column === -1) {
      continue;
    }

    results.push({
      path: relative,
      // Editors count from one; `indexOf` and the loop count from zero.
      line: index + 1,
      column: column + 1,
      // A preview for the results list, not the line itself — a long line is
      // cut here, while `line` and `column` still address the real file.
      text: line.length > MAX_PREVIEW_LENGTH ? line.slice(0, MAX_PREVIEW_LENGTH) : line,
    });
    matchesInFile++;
  }
}

async function searchDirectory(directory, searchTerm, results) {
  const MAX_RESULTS = 25;

  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {

    let entryName = entry.name;
    entryName = entryName.toLowerCase();
    const searchTermLower = searchTerm.toLowerCase();

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!FoldersToIgnore.includes(entry.name)) {
        if (results.length < MAX_RESULTS) {
          await searchDirectory(fullPath, searchTerm, results);
        }
      }
    } else if (entryName.includes(searchTermLower)) {
      if (results.length < MAX_RESULTS) {
        results.push(fullPath);
      }
    }
  }
}