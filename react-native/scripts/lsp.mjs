import {execFileSync, spawn} from 'node:child_process';

import fs from 'node:fs';
import path from 'node:path';

/**
 * A language server, over a WebSocket, per language per project.
 *
 * Monaco ships intelligence for TypeScript, JavaScript, CSS, HTML and JSON and
 * nothing else. For everything else the editor speaks LSP to whichever server
 * is installed on this machine: the socket carries the JSON-RPC messages as
 * they are, and this end frames them onto the server's stdin and unframes its
 * stdout. No server installed for a language is a normal state — the client is
 * told so and the file opens without hover or completion, as before.
 */
export const ENDPOINT = '/lsp';

/**
 * Monaco language id -> the command that speaks LSP over stdio for it. The
 * first one whose binary is on PATH wins, so installing any of them is enough.
 */
export const SERVERS = {
  typescript: [['typescript-language-server', '--stdio'], ['vtsls', '--stdio']],
  javascript: [['typescript-language-server', '--stdio'], ['vtsls', '--stdio']],
  ruby: [['ruby-lsp'], ['solargraph', 'stdio']],
  erb: [['ruby-lsp']],
  python: [['pyright-langserver', '--stdio'], ['pylsp'], ['ruff', 'server']],
  go: [['gopls']],
  rust: [['rust-analyzer']],
  swift: [['sourcekit-lsp']],
  c: [['clangd']],
  cpp: [['clangd']],
  objective_c: [['clangd']],
  php: [['intelephense', '--stdio'], ['phpactor', 'language-server']],
  css: [['vscode-css-language-server', '--stdio']],
  scss: [['vscode-css-language-server', '--stdio']],
  less: [['vscode-css-language-server', '--stdio']],
  html: [['vscode-html-language-server', '--stdio']],
  json: [['vscode-json-language-server', '--stdio']],
  yaml: [['yaml-language-server', '--stdio']],
  dockerfile: [['docker-langserver', '--stdio']],
  shell: [['bash-language-server', 'start']],
  lua: [['lua-language-server']],
  kotlin: [['kotlin-language-server']],
  java: [['jdtls']],
  elixir: [['elixir-ls']],
  dart: [['dart', 'language-server', '--protocol=lsp']],
  markdown: [['marksman', 'server']],
};

const found = new Map();

/**
 * Resolved through the user's login shell, like the terminal is: language
 * servers are installed by version managers whose shims live in a PATH this
 * process may not have inherited.
 */
export function which(binary) {
  if (found.has(binary)) {
    return found.get(binary);
  }

  let resolved = null;

  try {
    const shell = process.env.SHELL || '/bin/zsh';
    resolved = execFileSync(shell, ['-lic', `command -v ${binary}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim() || null;
  } catch (error) {
    resolved = null;
  }

  found.set(binary, resolved);
  return resolved;
}

export function serverFor(language) {
  for (const [binary, ...args] of SERVERS[language] ?? []) {
    const resolved = which(binary);

    if (resolved) {
      return {command: resolved, args, binary};
    }
  }

  return null;
}

/** Every language with a server installed — the health endpoint reports it. */
export function languageServers() {
  const available = {};

  for (const language of Object.keys(SERVERS)) {
    const server = serverFor(language);

    if (server) {
      available[language] = server.binary;
    }
  }

  return available;
}

/**
 * LSP over stdio is `Content-Length: N\r\n\r\n<N bytes of JSON>`. Bytes arrive
 * in whatever chunks the pipe feels like, so the parser is a small state
 * machine over a buffer.
 */
export function createFrameParser(onMessage) {
  let buffer = Buffer.alloc(0);

  return chunk => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');

      if (headerEnd === -1) {
        return;
      }

      const header = buffer.slice(0, headerEnd).toString('ascii');
      const match = /Content-Length:\s*(\d+)/i.exec(header);

      if (!match) {
        // Garbage before a header — drop it and look for the next one.
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }

      const length = Number(match[1]);
      const start = headerEnd + 4;

      if (buffer.length < start + length) {
        return;
      }

      const body = buffer.slice(start, start + length).toString('utf8');
      buffer = buffer.slice(start + length);
      onMessage(body);
    }
  };
}

export function frame(json) {
  const body = Buffer.from(json, 'utf8');
  return Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'ascii'), body]);
}

export function openLanguageServer(connection, searchParams) {
  const language = searchParams.get('language');
  const projectRoot = searchParams.get('projectRoot');
  const server = serverFor(language);

  const send = message => {
    if (connection.readyState === connection.OPEN) {
      connection.send(JSON.stringify(message));
    }
  };

  if (!server) {
    send({type: 'unavailable', language, candidates: (SERVERS[language] ?? []).map(([binary]) => binary)});
    connection.close();
    return;
  }

  const cwd = projectRoot && fs.existsSync(projectRoot) ? path.resolve(projectRoot) : process.cwd();

  const child = spawn(server.command, server.args, {
    cwd,
    env: {...process.env, NODE_OPTIONS: undefined},
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  child.on('error', error => {
    send({type: 'error', message: `${server.binary}: ${error.message}`});
    connection.close();
  });

  child.stdout.on('data', createFrameParser(body => {
    send({type: 'message', body});
  }));

  child.stderr.on('data', data => {
    send({type: 'log', text: data.toString()});
  });

  child.on('exit', (code, signal) => {
    send({type: 'exit', code, signal});
    connection.close();
  });

  send({type: 'ready', language, server: server.binary, cwd});

  connection.on('message', raw => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch (error) {
      return;
    }

    if (message.type === 'message' && typeof message.body === 'string' && !child.killed) {
      child.stdin.write(frame(message.body));
    }
  });

  connection.on('close', () => {
    try {
      child.kill();
    } catch (error) {
      // Already gone.
    }
  });
}
