import {HttpError, readJson, sendJson} from '../http.mjs';

import {execFile} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {resolveTarget} from '../projectPaths.mjs';

const MAX_OUTPUT = 20 * 1024 * 1024;

/**
 * `git` as a subprocess, in the project. A project that is not a repository is
 * a normal state for the editor to be in, so that case is reported rather than
 * thrown: the sidebar shows "not a repository" and the tree stays uncoloured.
 */
export function git(cwd, args, {input} = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'git',
      ['-c', 'core.quotepath=off', ...args],
      {cwd, maxBuffer: MAX_OUTPUT, env: {...process.env, GIT_OPTIONAL_LOCKS: '0'}},
      (error, stdout, stderr) => {
        if (error) {
          error.stderr = stderr;
          reject(error);
          return;
        }

        resolve(stdout);
      },
    );

    if (input != null) {
      child.stdin.end(input);
    }
  });
}

async function isRepository(cwd) {
  try {
    const out = await git(cwd, ['rev-parse', '--is-inside-work-tree']);
    return out.trim() === 'true';
  } catch (error) {
    return false;
  }
}

/**
 * `git status --porcelain=v1 -z`: two status letters, a space, the path, and
 * for a rename a second NUL-separated path (the original) after it.
 */
export function parseStatus(raw) {
  const entries = [];
  const parts = raw.split('\0');

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];

    if (!part) {
      continue;
    }

    const index_ = part[0];
    const worktree = part[1];
    const filePath = part.slice(3);
    const entry = {path: filePath, index: index_, worktree};

    if (index_ === 'R' || index_ === 'C') {
      entry.from = parts[++index];
    }

    entries.push(entry);
  }

  return entries;
}

function realpath(target) {
  try {
    return fs.realpathSync(path.resolve(target));
  } catch (error) {
    return path.resolve(target);
  }
}

export async function status({response, searchParams}) {
  const {projectRoot} = resolveTarget(searchParams);

  if (!(await isRepository(projectRoot))) {
    sendJson(response, {repository: false, branch: null, changes: []});
    return;
  }

  const [branch, raw, root] = await Promise.all([
    git(projectRoot, ['rev-parse', '--abbrev-ref', 'HEAD']).catch(() => 'HEAD'),
    git(projectRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all']),
    git(projectRoot, ['rev-parse', '--show-toplevel']),
  ]);

  sendJson(response, {
    repository: true,
    branch: branch.trim(),
    root: root.trim(),
    changes: relativeToProject(parseStatus(raw), root.trim(), projectRoot),
  });
}

/**
 * Porcelain output names paths from the repository root whatever the working
 * directory, and the project the editor has open may be a folder inside the
 * repository. Everything else in the editor is project-relative, so the
 * status is made so too; changes outside the project are not its concern.
 */
export function relativeToProject(changes, repositoryRoot, projectRoot) {
  // git reports the real path; the project may have been opened through a
  // symlink (macOS's /tmp and /var are ones), so both are resolved the same way.
  const repo = realpath(repositoryRoot);
  const project = realpath(projectRoot);

  if (repo === project) {
    return changes;
  }

  const rebase = filePath => {
    const relative = path.relative(project, path.join(repo, filePath));
    return relative.startsWith('..') || path.isAbsolute(relative) ? null : relative;
  };

  const result = [];

  for (const change of changes) {
    const rebased = rebase(change.path);

    if (rebased === null) {
      continue;
    }

    const next = {...change, path: rebased};

    if (change.from) {
      next.from = rebase(change.from) ?? change.from;
    }

    result.push(next);
  }

  return result;
}

/** The committed version of a file, for the gutter and the diff view. */
export async function show({response, searchParams}) {
  const {projectRoot, wantedPath} = resolveTarget(searchParams);
  const ref = searchParams.get('ref') || 'HEAD';

  if (!/^[\w./~^-]+$/.test(ref)) {
    throw new HttpError(400, `Bad ref: ${ref}`);
  }

  try {
    const contents = await git(projectRoot, ['show', `${ref}:./${wantedPath}`]);
    sendJson(response, {path: wantedPath, ref, contents, exists: true});
  } catch (error) {
    // A new file has no committed version; that is an empty original, not
    // an error.
    sendJson(response, {path: wantedPath, ref, contents: '', exists: false});
  }
}

export async function diff({response, searchParams}) {
  const {projectRoot, wantedPath} = resolveTarget(searchParams);
  const staged = searchParams.get('staged') === 'true';
  const args = ['diff', '--no-color'];

  if (staged) {
    args.push('--cached');
  }

  if (wantedPath) {
    args.push('--', wantedPath);
  }

  sendJson(response, {path: wantedPath, diff: await git(projectRoot, args)});
}

export async function stage({request, response, searchParams}) {
  const {projectRoot} = resolveTarget(searchParams);
  const {paths, all} = await readJson(request);

  if (all) {
    await git(projectRoot, ['add', '-A']);
  } else {
    await git(projectRoot, ['add', '-A', '--', ...requirePaths(paths)]);
  }

  sendJson(response, {ok: true});
}

export async function unstage({request, response, searchParams}) {
  const {projectRoot} = resolveTarget(searchParams);
  const {paths, all} = await readJson(request);

  if (all) {
    await git(projectRoot, ['reset', '-q']);
  } else {
    await git(projectRoot, ['reset', '-q', '--', ...requirePaths(paths)]);
  }

  sendJson(response, {ok: true});
}

/** Throw away the working-tree changes of a file: `git checkout -- path`. */
export async function discard({request, response, searchParams}) {
  const {projectRoot} = resolveTarget(searchParams);
  const {paths} = await readJson(request);

  for (const filePath of requirePaths(paths)) {
    try {
      await git(projectRoot, ['checkout', '--', filePath]);
    } catch (error) {
      // Untracked: nothing to check out, so it is removed instead.
      await git(projectRoot, ['clean', '-f', '--', filePath]);
    }
  }

  sendJson(response, {ok: true});
}

export async function commit({request, response, searchParams}) {
  const {projectRoot} = resolveTarget(searchParams);
  const {message, amend} = await readJson(request);

  if (!amend && (typeof message !== 'string' || !message.trim())) {
    throw new HttpError(400, 'A commit message is required');
  }

  const args = ['commit', '-F', '-'];

  if (amend) {
    args.push('--amend');
    if (!message) {
      args.push('--no-edit');
    }
  }

  try {
    const out = await git(projectRoot, args, {input: message ?? ''});
    sendJson(response, {ok: true, output: out});
  } catch (error) {
    throw new HttpError(400, (error.stderr || error.message).trim());
  }
}

export async function log({response, searchParams}) {
  const {projectRoot} = resolveTarget(searchParams);
  const limit = Math.min(200, Number(searchParams.get('limit')) || 30);
  const raw = await git(projectRoot, [
    'log',
    `-n${limit}`,
    '--pretty=format:%H%x1f%h%x1f%an%x1f%aI%x1f%s%x1e',
  ]).catch(() => '');

  const commits = raw
    .split('\x1e')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [hash, short, author, date, subject] = line.split('\x1f');
      return {hash, short, author, date, subject};
    });

  sendJson(response, {commits});
}

export async function branches({response, searchParams}) {
  const {projectRoot} = resolveTarget(searchParams);
  const raw = await git(projectRoot, ['branch', '--format=%(refname:short)%09%(HEAD)']).catch(() => '');

  const list = raw
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [name, head] = line.split('\t');
      return {name, current: head === '*'};
    });

  sendJson(response, {branches: list});
}

export async function checkout({request, response, searchParams}) {
  const {projectRoot} = resolveTarget(searchParams);
  const {branch, create} = await readJson(request);

  if (typeof branch !== 'string' || !/^[\w.][\w./-]*$/.test(branch)) {
    throw new HttpError(400, 'A valid branch name is required');
  }

  try {
    await git(projectRoot, create ? ['checkout', '-b', branch] : ['checkout', branch]);
  } catch (error) {
    throw new HttpError(400, (error.stderr || error.message).trim());
  }

  sendJson(response, {ok: true});
}

function requirePaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new HttpError(400, 'paths is required');
  }

  for (const filePath of paths) {
    if (typeof filePath !== 'string' || filePath.startsWith('-')) {
      throw new HttpError(400, `Bad path: ${filePath}`);
    }
  }

  return paths;
}
