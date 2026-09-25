import {HttpError, readJson, sendJson} from '../http.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';
import {resolveTarget} from '../projectPaths.mjs';

export async function readFile({response, searchParams}) {
  const target = resolveTarget(searchParams);
  const stats = await stat(target.absolute);

  if (stats.isDirectory()) {
    throw new HttpError(400, `Not a file: ${target.wantedPath}`);
  }

  const contents = await fs.readFile(target.absolute, 'utf8');
  sendJson(response, {
    path: target.wantedPath,
    contents,
    mtime: stats.mtimeMs,
    size: stats.size,
  });
}

export async function statFile({response, searchParams}) {
  const target = resolveTarget(searchParams);
  const stats = await stat(target.absolute);

  sendJson(response, {
    path: target.wantedPath,
    exists: true,
    isDirectory: stats.isDirectory(),
    mtime: stats.mtimeMs,
    size: stats.size,
  });
}

export async function listDirectory({response, searchParams}) {
  const target = resolveTarget(searchParams);

  const entries = await fs.readdir(target.absolute, {withFileTypes: true});
  const contents = entries.map(entry => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
    fullPath: path.join(target.wantedPath, entry.name),
  }));

  sendJson(response, {path: target.wantedPath, contents});
}

export async function writeFile({request, response, searchParams}) {
  const target = resolveTarget(searchParams);
  const body = await readJson(request);

  if (typeof body.contents !== 'string') {
    throw new HttpError(400, 'contents must be a string');
  }

  // The client may say which version of the file it edited. A write against
  // a file that changed underneath it is refused rather than clobbering the
  // other author's work; the client then gets to ask the user.
  if (body.expectedMtime != null) {
    const current = await stat(target.absolute).catch(() => null);

    if (current && Math.abs(current.mtimeMs - body.expectedMtime) > 1) {
      throw new HttpError(409, `File changed on disk: ${target.wantedPath}`);
    }
  }

  await fs.writeFile(target.absolute, body.contents, 'utf8');
  const stats = await stat(target.absolute);
  sendJson(response, {path: target.wantedPath, mtime: stats.mtimeMs});
}

export async function deleteFile({response, searchParams}) {
  const target = resolveTarget(searchParams);

  if (target.absolute === target.projectRoot) {
    throw new HttpError(400, 'Refusing to delete the project root');
  }

  await stat(target.absolute);
  await fs.rm(target.absolute, {recursive: true});
  sendJson(response, {path: target.wantedPath});
}

export async function createFile({request, response, searchParams}) {
  const target = resolveTarget(searchParams);
  const body = await readJson(request);

  if (await exists(target.absolute)) {
    throw new HttpError(409, `Already exists: ${target.wantedPath}`);
  }

  await fs.mkdir(path.dirname(target.absolute), {recursive: true});
  await fs.writeFile(target.absolute, body.contents ?? '', 'utf8');
  const stats = await stat(target.absolute);
  sendJson(response, {path: target.wantedPath, mtime: stats.mtimeMs});
}

export async function createDirectory({response, searchParams}) {
  const target = resolveTarget(searchParams);

  if (await exists(target.absolute)) {
    throw new HttpError(409, `Already exists: ${target.wantedPath}`);
  }

  await fs.mkdir(target.absolute, {recursive: true});
  sendJson(response, {path: target.wantedPath});
}

/** Rename and move are the same operation: `from` and `to` are project paths. */
export async function renameFile({response, searchParams}) {
  const from = resolveTarget(searchParams, 'from');
  const to = resolveTarget(searchParams, 'to');

  if (!searchParams.get('to')) {
    throw new HttpError(400, 'to is required');
  }

  if (from.absolute === from.projectRoot) {
    throw new HttpError(400, 'Refusing to move the project root');
  }

  await stat(from.absolute);

  if (await exists(to.absolute)) {
    throw new HttpError(409, `Already exists: ${to.wantedPath}`);
  }

  await fs.mkdir(path.dirname(to.absolute), {recursive: true});
  await fs.rename(from.absolute, to.absolute);
  sendJson(response, {from: from.wantedPath, to: to.wantedPath});
}

async function stat(absolute) {
  try {
    return await fs.stat(absolute);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new HttpError(404, `Not found: ${absolute}`);
    }

    throw error;
  }
}

async function exists(absolute) {
  try {
    await fs.lstat(absolute);
    return true;
  } catch (error) {
    return false;
  }
}
