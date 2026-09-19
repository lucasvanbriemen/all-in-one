import {ENDPOINT as EVENTS_ENDPOINT, openEvents} from './watcher.mjs';
import {ENDPOINT as LSP_ENDPOINT, languageServers, openLanguageServer} from './lsp.mjs';
import {ENDPOINT as TERMINAL_ENDPOINT, fromLoopback, openShell} from './terminal.mjs';

import {WebSocketServer} from 'ws';
import {createRouter} from './fileserver/router.mjs';
import http from 'node:http';

const HOST = '127.0.0.1';
const PORT = Number(process.env.AIO_PORT) || 4001;

const server = http.createServer(createRouter());

/**
 * Three sockets on the one port: `/terminal` (a shell), `/events` (file
 * changes) and `/lsp` (a language server). A WebSocket handshake is not
 * subject to CORS, so every one of them is refused unless the `Origin` could
 * not have come from a website — see `fromLoopback` in `terminal.mjs`.
 */
const SOCKETS = {
  [TERMINAL_ENDPOINT]: openShell,
  [EVENTS_ENDPOINT]: openEvents,
  [LSP_ENDPOINT]: openLanguageServer,
};

const sockets = new WebSocketServer({noServer: true});

server.on('upgrade', (request, socket, head) => {
  const {pathname, searchParams} = new URL(request.url, 'http://localhost');
  const open = SOCKETS[pathname];

  if (!open) {
    socket.destroy();
    return;
  }

  if (!fromLoopback(request.headers.origin)) {
    console.error(`Refused ${pathname} from origin: ${request.headers.origin}`);
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  sockets.handleUpgrade(request, socket, head, connection => {
    open(connection, searchParams);
  });
});

// End the process when the app is stopped
if (process.env.AIO_EXIT_ON_STDIN_EOF === '1') {
  process.stdin.on('end', () => process.exit(0));
  process.stdin.resume();
}

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is taken — is another file server running?`);
    process.exit(1);
  }

  throw error;
});

server.listen(PORT, HOST, () => {
  console.log(`listening on http://${HOST}:${PORT}`);

  // Finding language servers means asking the login shell, once per binary.
  // Done now, off the request path, so the first health check does not wait
  // for it.
  setTimeout(() => {
    const available = languageServers();
    console.log(`language servers: ${Object.keys(available).join(', ') || 'none'}`);
  }, 0);
});
