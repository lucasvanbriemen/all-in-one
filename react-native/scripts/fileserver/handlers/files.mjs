import {readBody, sendJson} from '../http.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';
import {resolveInProject} from '../projectPaths.mjs';

export async function readFile({response, searchParams}) {
  const target = resolveTarget(searchParams);

  const contents = await fs.readFile(target.absolute, 'utf8');
  sendJson(response, 200, {path: target.wantedPath, contents});
}

export async function listDirectory({response, searchParams}) {
  const target = resolveTarget(searchParams);

  const entries = await fs.readdir(target.absolute, {withFileTypes: true});
  const contents = entries.map(entry => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
    fullPath: path.join(target.wantedPath, entry.name),
  }));

  sendJson(response, 200, {path: target.wantedPath, contents});
}

export async function writeFile({request, response, searchParams}) {
  const target = resolveTarget(searchParams);

  let contents = JSON.parse(await readBody(request)).contents;
  
  await fs.writeFile(target.absolute, contents, 'utf8');
  sendJson(response, 200, {path: target.wantedPath});
}

function resolveTarget(searchParams) {
  const projectRoot = searchParams.get('projectRoot');
  const requestedPath = searchParams.get('path');

  const wantedPath = requestedPath || '';
  const absolute = resolveInProject(projectRoot, wantedPath);

  return {absolute, wantedPath};
}
