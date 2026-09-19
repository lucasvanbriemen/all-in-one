import {makeProject, startServer} from './helpers.mjs';

import {execFileSync} from 'node:child_process';
import {parseStatus} from '../../scripts/fileserver/handlers/git.mjs';

let server;
let project;

const run = (args, cwd = project.root) =>
  execFileSync('git', args, {cwd, stdio: 'pipe', env: {...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t'}}).toString();

beforeAll(async () => {
  server = await startServer();
});

afterAll(() => server.close());

beforeEach(async () => {
  project = await makeProject({'a.txt': 'one\n', 'b.txt': 'two\n'});
  run(['init', '-q', '-b', 'main']);
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'initial']);
});

afterEach(() => project.remove());

const query = (extra = {}) => ({projectRoot: project.root, ...extra});

test('a folder that is not a repository is reported, not an error', async () => {
  const plain = await makeProject({'x.txt': 'x'});
  const {status, json} = await server.request('GET', '/git/status', {query: {projectRoot: plain.root}});
  expect(status).toBe(200);
  expect(json).toEqual({repository: false, branch: null, changes: []});
  await plain.remove();
});

test('status reports the branch and every kind of change', async () => {
  await server.request('PUT', '/file', {query: query({path: 'a.txt'}), body: {contents: 'changed\n'}});
  await server.request('POST', '/file', {query: query({path: 'new.txt'}), body: {contents: 'new'}});
  await server.request('DELETE', '/file', {query: query({path: 'b.txt'})});

  const {json} = await server.request('GET', '/git/status', {query: query()});
  expect(json.repository).toBe(true);
  expect(json.branch).toBe('main');

  const byPath = Object.fromEntries(json.changes.map(change => [change.path, change]));
  expect(byPath['a.txt'].worktree).toBe('M');
  expect(byPath['new.txt'].index).toBe('?');
  expect(byPath['b.txt'].worktree).toBe('D');
});

test('show returns the committed version and an empty original for a new file', async () => {
  await server.request('PUT', '/file', {query: query({path: 'a.txt'}), body: {contents: 'changed\n'}});

  const committed = await server.request('GET', '/git/show', {query: query({path: 'a.txt'})});
  expect(committed.json).toMatchObject({contents: 'one\n', exists: true});

  const fresh = await server.request('GET', '/git/show', {query: query({path: 'nothing.txt'})});
  expect(fresh.json).toMatchObject({contents: '', exists: false});

  const bad = await server.request('GET', '/git/show', {query: query({path: 'a.txt', ref: '--output=/tmp/x'})});
  expect(bad.status).toBe(400);
});

test('stage, unstage, commit and log', async () => {
  await server.request('PUT', '/file', {query: query({path: 'a.txt'}), body: {contents: 'changed\n'}});

  const staged = await server.request('POST', '/git/stage', {query: query(), body: {paths: ['a.txt']}});
  expect(staged.status).toBe(200);

  let {json} = await server.request('GET', '/git/status', {query: query()});
  expect(json.changes[0]).toMatchObject({path: 'a.txt', index: 'M', worktree: ' '});

  await server.request('POST', '/git/unstage', {query: query(), body: {paths: ['a.txt']}});
  ({json} = await server.request('GET', '/git/status', {query: query()}));
  expect(json.changes[0]).toMatchObject({path: 'a.txt', index: ' ', worktree: 'M'});

  const empty = await server.request('POST', '/git/commit', {query: query(), body: {message: '  '}});
  expect(empty.status).toBe(400);

  await server.request('POST', '/git/stage', {query: query(), body: {all: true}});
  const committed = await server.request('POST', '/git/commit', {query: query(), body: {message: 'second'}});
  expect(committed.status).toBe(200);

  const log = await server.request('GET', '/git/log', {query: query()});
  expect(log.json.commits.map(commit => commit.subject)).toEqual(['second', 'initial']);

  ({json} = await server.request('GET', '/git/status', {query: query()}));
  expect(json.changes).toEqual([]);
});

test('discard restores a tracked file and removes an untracked one', async () => {
  await server.request('PUT', '/file', {query: query({path: 'a.txt'}), body: {contents: 'changed\n'}});
  await server.request('POST', '/file', {query: query({path: 'junk.txt'}), body: {contents: 'x'}});

  await server.request('POST', '/git/discard', {query: query(), body: {paths: ['a.txt', 'junk.txt']}});
  expect(await project.read('a.txt')).toBe('one\n');
  expect(await project.exists('junk.txt')).toBe(false);
});

test('branches and checkout', async () => {
  const created = await server.request('POST', '/git/checkout', {query: query(), body: {branch: 'feature', create: true}});
  expect(created.status).toBe(200);

  const {json} = await server.request('GET', '/git/branches', {query: query()});
  expect(json.branches).toEqual(expect.arrayContaining([
    {name: 'main', current: false},
    {name: 'feature', current: true},
  ]));

  const bad = await server.request('POST', '/git/checkout', {query: query(), body: {branch: '--force'}});
  expect(bad.status).toBe(400);
});

test('paths are validated', async () => {
  const none = await server.request('POST', '/git/stage', {query: query(), body: {}});
  expect(none.status).toBe(400);

  const flag = await server.request('POST', '/git/stage', {query: query(), body: {paths: ['--all']}});
  expect(flag.status).toBe(400);
});

test('parseStatus handles renames', () => {
  const raw = 'R  new.txt\0old.txt\0 M a.txt\0?? untracked.txt\0';
  expect(parseStatus(raw)).toEqual([
    {path: 'new.txt', index: 'R', worktree: ' ', from: 'old.txt'},
    {path: 'a.txt', index: ' ', worktree: 'M'},
    {path: 'untracked.txt', index: '?', worktree: '?'},
  ]);
});

test('a project that is a folder inside the repository sees project-relative paths', async () => {
  const {relativeToProject} = require('../../scripts/fileserver/handlers/git.mjs');
  const changes = [
    {path: 'app/src/a.js', index: ' ', worktree: 'M'},
    {path: 'other/b.js', index: '?', worktree: '?'},
    {path: 'app/new.js', index: 'R', worktree: ' ', from: 'app/old.js'},
  ];
  expect(relativeToProject(changes, '/repo', '/repo/app')).toEqual([
    {path: 'src/a.js', index: ' ', worktree: 'M'},
    {path: 'new.js', index: 'R', worktree: ' ', from: 'old.js'},
  ]);
  expect(relativeToProject(changes, '/repo', '/repo')).toBe(changes);

  // And against a real repository.
  await server.request('POST', '/file', {query: query({path: 'sub/inner.txt'}), body: {contents: 'x'}});
  const {json} = await server.request('GET', '/git/status', {query: {projectRoot: `${project.root}/sub`}});
  expect(json.changes).toEqual([{path: 'inner.txt', index: '?', worktree: '?'}]);
});
