import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const server = http.createServer(async (request, response) => {
  const { method, url } = request;
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const relative = searchParams.get('path');

  const ROOT = "/Users/lucas/Desktop/personal/code/all-in-one/react-native";

  if (method !== 'GET' || pathname !== '/file') {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  if (!relative) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'missing path parameter' }));
    return;
  }

  if (relative.includes('..')) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'invalid path parameter' }));
    return;
  }

  if (relative.startsWith('/')) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'invalid path parameter' }));
    return;
  }

  const absolute = path.resolve(ROOT, relative);

  try {
    const contents = await fs.readFile(absolute, 'utf8');
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ path: relative, contents }));
  } catch (error) {
    console.error(`Failed to read file: ${absolute}; error: ${error}`);
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
  }
});

server.listen(4001, '127.0.0.1', () => {
  console.log('listening on http://127.0.0.1:4001');
});