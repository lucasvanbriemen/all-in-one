import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const server = http.createServer(async (request, response) => {
  const { method, url } = request;
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const relative = searchParams.get('path');

  const ROOT = "/Users/lucas/Desktop/personal/code/all-in-one/react-native";

  if (method == "PUT" && pathname === "/file") {
    return new Promise((resolve) => {
      let body = '';
      request.on('data', chunk => {
        body += chunk.toString();
      });
      request.on('end', async () => {
        const wantedPath = relative || '';
        const absolute = path.resolve(ROOT, wantedPath);

        if (!absolute.startsWith(ROOT)) {
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

  const absolute = path.resolve(ROOT, wantedPath);


  if (!absolute.startsWith(ROOT)) {
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
    }));
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ path: wantedPath, contents }));
  } catch (error) {
    console.error(`Failed to read directory: ${absolutePath}; error: ${error}`);
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
  }
}
