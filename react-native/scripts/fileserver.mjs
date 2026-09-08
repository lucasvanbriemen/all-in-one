import {attachTerminal} from './terminal.mjs';
import {createRouter} from './fileserver/router.mjs';
import {routes} from './fileserver/routes.mjs';
import http from 'node:http';

/**
 * The Code page's filesystem and shell, for the editor in the macOS app.
 *
 * This file is only the process: the socket it listens on, and the two things
 * that own its lifetime. What it answers is declared in `fileserver/routes.mjs`
 * and served by the handlers that table names.
 *
 * Loopback only, and deliberately so — this serves the user's filesystem to
 * anything that can reach the port, and `terminal.mjs` serves a shell.
 */
const HOST = '127.0.0.1';
const PORT = 4001;

const server = http.createServer(createRouter(routes));

// The editor's shell, on the same port: `ws://127.0.0.1:4001/terminal`.
attachTerminal(server);

/**
 * Two things want to own this port: the copy started from the Procfile during
 * development, and the copy the packaged .app spawns out of its own bundle.
 * Only one can bind, and whichever loses is redundant rather than broken — the
 * editor talks to a port, not to a particular process, so the survivor serves
 * both. Standing down is therefore the correct outcome, not a failure.
 */
server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.log(`port ${PORT} already served; deferring to the running server`);
    process.exit(0);
  }

  throw error;
});

/**
 * When the macOS app spawns this server it hands it a pipe on stdin and holds
 * the other end open for its own lifetime (see `SidecarServer.m`). A crash or a
 * `kill -9` skips every shutdown path the app could run, but it cannot keep a
 * pipe open, so EOF here means the app is gone and this process is orphaned —
 * and an orphan still holding the port would lock out the next launch.
 *
 * Only the app sets this; started from the Procfile the server keeps whatever
 * stdin the shell gave it and outlives nothing.
 */
if (process.env.AIO_EXIT_ON_STDIN_EOF === '1') {
  process.stdin.on('end', () => process.exit(0));
  process.stdin.resume();
}

server.listen(PORT, HOST, () => {
  console.log(`listening on http://${HOST}:${PORT}`);
});
