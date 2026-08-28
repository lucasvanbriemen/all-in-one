import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

import {attachTerminal} from './terminal.mjs';

const server = http.createServer(async (request, response) => {
  const { method, url } = request;
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const relative = searchParams.get('path');
  const projectRoot = searchParams.get('projectRoot');

  if (method == "GET" && pathname === "/search") {
    const searchTerm = searchParams.get('term');
    if (!searchTerm) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'missing term parameter' }));
      return;
    }
    return searchFiles(response, projectRoot, searchTerm);
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

async function searchDirectory(directory, searchTerm, results) {
  const FoldersToIgnore = ['node_modules', '.git', 'build', 'dist', 'out', 'venv', '__pycache__'];
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