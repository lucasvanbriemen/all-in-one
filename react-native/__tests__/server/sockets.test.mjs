import {createFrameParser, frame} from '../../scripts/lsp.mjs';
import {isIgnored, watchProject} from '../../scripts/watcher.mjs';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('LSP frames round-trip through the parser, whatever the chunking', () => {
  const received = [];
  const parse = createFrameParser(body => received.push(JSON.parse(body)));

  const bytes = Buffer.concat([
    frame(JSON.stringify({id: 1, method: 'initialize'})),
    frame(JSON.stringify({id: 2, method: 'textDocument/hover', params: {text: 'héllo'}})),
  ]);

  // One byte at a time is the worst case a pipe can do.
  for (let index = 0; index < bytes.length; index++) {
    parse(bytes.slice(index, index + 1));
  }

  expect(received).toEqual([
    {id: 1, method: 'initialize'},
    {id: 2, method: 'textDocument/hover', params: {text: 'héllo'}},
  ]);
});

test('ignored folders never produce events', () => {
  expect(isIgnored('node_modules/x/index.js')).toBe(true);
  expect(isIgnored('src/.git/HEAD')).toBe(true);
  expect(isIgnored('src/index.js')).toBe(false);
});

test('the watcher batches creates, changes and deletes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aio-watch-'));
  const batches = [];
  const stop = watchProject(root, changes => batches.push(changes));

  // Give the recursive watcher a moment to arm.
  await new Promise(resolve => setTimeout(resolve, 150));

  await fs.writeFile(path.join(root, 'a.txt'), 'one');
  await fs.mkdir(path.join(root, 'node_modules'));
  await fs.writeFile(path.join(root, 'node_modules', 'ignored.js'), 'x');

  await new Promise(resolve => setTimeout(resolve, 600));

  await fs.rm(path.join(root, 'a.txt'));
  await new Promise(resolve => setTimeout(resolve, 600));

  stop();
  await fs.rm(root, {recursive: true, force: true});

  const all = batches.flat();
  expect(all.some(change => change.path === 'a.txt' && change.kind === 'create')).toBe(true);
  expect(all.some(change => change.path === 'a.txt' && change.kind === 'delete')).toBe(true);
  expect(all.some(change => change.path.startsWith('node_modules'))).toBe(false);
}, 10000);

test('git bookkeeping files are reported while the rest of .git is not', async () => {
  const {isGitBookkeeping} = require('../../scripts/watcher.mjs');
  expect(isGitBookkeeping('.git/index')).toBe(true);
  expect(isGitBookkeeping('.git/HEAD')).toBe(true);
  expect(isGitBookkeeping('.git/refs/heads/main')).toBe(true);
  expect(isGitBookkeeping('.git/objects/ab/cdef')).toBe(false);
  expect(isGitBookkeeping('src/index.js')).toBe(false);
});
