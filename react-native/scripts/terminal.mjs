import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {WebSocketServer} from 'ws';
import pty from 'node-pty';

/**
 * A shell, over a WebSocket, on the file server.
 *
 * The editor already talks to this process for reads and writes, so the
 * terminal rides along on the same port rather than standing up a second
 * server. A pty is a stream in both directions and the browser's `fetch` is
 * not, hence the socket: one per panel, one shell behind each.
 */
const ENDPOINT = '/terminal';

/** Until the page has measured itself and told us what it can actually fit. */
const DEFAULT_SIZE = {cols: 80, rows: 24};

/**
 * A WebSocket handshake is not subject to CORS — any page in any browser the
 * user has open may open a socket to a loopback port and talk to whatever
 * answers it. This one answers with a shell, so a handshake is refused unless
 * its `Origin` could not have come from a website: React Native's client
 * derives the header from the URL it dialled, so ours arrives as the loopback
 * host, and a client that sends none at all was never a page to begin with.
 */
const LOOPBACK_ORIGINS = ['127.0.0.1', 'localhost', '::1'];

export function attachTerminal(server) {
  // `noServer`, so the origin is checked before the handshake is answered
  // rather than after a socket is already live.
  const sockets = new WebSocketServer({noServer: true});

  server.on('upgrade', (request, socket, head) => {
    const {pathname, searchParams} = new URL(request.url, 'http://localhost');

    if (pathname !== ENDPOINT) {
      socket.destroy();
      return;
    }

    if (!fromLoopback(request.headers.origin)) {
      console.error(`Refused terminal from origin: ${request.headers.origin}`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    sockets.handleUpgrade(request, socket, head, connection => {
      openShell(connection, searchParams);
    });
  });
}

function fromLoopback(origin) {
  if (!origin) {
    return true;
  }

  try {
    return LOOPBACK_ORIGINS.includes(new URL(origin).hostname);
  } catch (error) {
    return false;
  }
}

function openShell(connection, searchParams) {
  const size = {
    cols: dimension(searchParams.get('cols'), DEFAULT_SIZE.cols),
    rows: dimension(searchParams.get('rows'), DEFAULT_SIZE.rows),
  };

  const shell = process.env.SHELL || '/bin/zsh';
  const cwd = workingDirectory(searchParams.get('cwd'));

  // A login shell, so the panel comes up with the PATH, aliases and prompt the
  // user's own terminal has. What this process inherited is whatever started
  // it — under `foreman` that is a stripped environment two levels removed
  // from the user's shell, and `git` and `rbenv` would both be missing from it.
  const shellProcess = pty.spawn(shell, ['-l'], {
    name: 'xterm-256color',
    cwd,
    cols: size.cols,
    rows: size.rows,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      // Inherited from the watcher this server runs under, and it would be
      // handed to every `node` the user ran in here.
      NODE_OPTIONS: undefined,
    },
  });

  send(connection, {type: 'ready', cwd, shell, pid: shellProcess.pid});

  shellProcess.onData(data => send(connection, {type: 'output', data}));

  shellProcess.onExit(({exitCode, signal}) => {
    send(connection, {type: 'exit', exitCode, signal});
    connection.close();
  });

  connection.on('message', raw => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch (error) {
      console.error(`Failed to parse terminal message; error: ${error}`);
      return;
    }

    if (message.type === 'input') {
      shellProcess.write(message.data);
    }

    if (message.type === 'resize') {
      // node-pty rejects anything that is not a positive integer, and the
      // panel reports zeroes for as long as it is laid out but unmeasured.
      shellProcess.resize(
        dimension(message.cols, size.cols),
        dimension(message.rows, size.rows),
      );
    }
  });

  // The shell outlives the socket otherwise: the pty stays open and whatever
  // was running goes on running with nothing left to read it. SIGHUP is what a
  // real terminal sends when its window closes, so job control does the rest.
  connection.on('close', () => {
    try {
      shellProcess.kill('SIGHUP');
    } catch (error) {
      // Already gone — `onExit` is what closed the socket.
    }
  });
}

function send(connection, message) {
  if (connection.readyState !== connection.OPEN) {
    return;
  }

  connection.send(JSON.stringify(message));
}

function dimension(value, fallback) {
  const size = Math.floor(Number(value));

  return Number.isFinite(size) && size > 0 ? size : fallback;
}

/**
 * The project the editor has open, when it has one. A root that has since been
 * renamed or unmounted must not take the shell down with it, so anything that
 * is not a directory right now falls back to the home directory.
 */
function workingDirectory(requested) {
  if (!requested) {
    return os.homedir();
  }

  const absolute = path.resolve(requested);

  try {
    if (fs.statSync(absolute).isDirectory()) {
      return absolute;
    }
  } catch (error) {
    console.error(`Terminal cwd is unreadable: ${absolute}; error: ${error}`);
  }

  return os.homedir();
}
