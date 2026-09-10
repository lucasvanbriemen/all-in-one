import {attachTerminal} from './terminal.mjs';
import {createRouter} from './fileserver/router.mjs';
import http from 'node:http';
import {routes} from './fileserver/routes.mjs';

const HOST = '127.0.0.1';
const PORT = 4001;

const server = http.createServer(createRouter(routes));

// The editor's shell, on the same port: `ws://127.0.0.1:4001/terminal`.
attachTerminal(server);

// End the process when the app is stopped
if (process.env.AIO_EXIT_ON_STDIN_EOF === '1') {
  process.stdin.on('end', () => process.exit(0));
  process.stdin.resume();
}

server.listen(PORT, HOST, () => {
  console.log(`listening on http://${HOST}:${PORT}`);
});
