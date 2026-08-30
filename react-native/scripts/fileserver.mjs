import {attachTerminal} from './terminal.mjs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const server = http.createServer(async (request, response) => {
  const { method, url } = request;
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const relative = searchParams.get('path');
  const projectRoot = searchParams.get('projectRoot');

  if (method == "GET" && pathname === "/search") {
    const searchTerm = searchParams.get('term');
    const searchingFor = searchParams.get('type');
    if (!searchTerm) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'missing term parameter' }));
      return;
    }

    if (searchingFor == 'files') {
      return searchFiles(response, projectRoot, searchTerm);
    } else {
      return searchCode(response, projectRoot, searchTerm);
    }
  }

  if (method == "PUT" && pathname === "/file") {
    return new Promise((resolve) => {
      let body = '';
      request.on('data', chunk => {
        body += chunk.toString();
      });
      request.on('end', async () => {
        const wantedPath = relative || '';
        const absolute = path.resolve(projectRoot, wantedPath);

        // convert the body from json string to an object
        try {
          const parsedBody = JSON.parse(body);
          body = parsedBody.contents;
        } catch (error) {
          console.error(`Failed to parse request body: ${body}; error: ${error}`);
          response.writeHead(400, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ error: 'invalid request body' }));
          return resolve();
        }

        if (!absolute.startsWith(projectRoot)) {
          response.writeHead(400, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ error: 'invalid path parameter' }));
          return resolve();
        }

        try {
          await fs.writeFile(absolute, body, 'utf8');
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ path: wantedPath }));
        } catch (error) {
          console.error(`Failed to write file: ${absolute}; error: ${error}`);
          response.writeHead(500, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ error: 'failed to write file' }));
        }
        resolve();
      });
    });
  }

  if (method !== 'GET' || (pathname !== '/file' && pathname !== '/files')) {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  if (!relative && pathname === '/file') {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'missing path parameter' }));
    return;
  }

  const wantedPath = relative || '';

  if (wantedPath.includes('..')) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'invalid path parameter' }));
    return;
  }

  if (wantedPath.startsWith('/') && pathname === '/file') {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'invalid path parameter' }));
    return;
  }

  const absolute = path.resolve(projectRoot, wantedPath);


  if (!absolute.startsWith(projectRoot)) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'invalid path parameter' }));
    return;
  }

  if (pathname === '/file') {
    return getFileContents(absolute, response, wantedPath);
  } else if (pathname === '/files') {
    let path = wantedPath || '';
    return getDirectoryContents(absolute, response, wantedPath);
  }
});

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