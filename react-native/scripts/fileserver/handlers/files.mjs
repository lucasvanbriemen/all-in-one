import {readBody, sendError, sendJson} from '../http.mjs';
import {resolveInProject} from '../projectPaths.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * GET /file?projectRoot=…&path=…
 *
 * The contents come back as a string in JSON rather than as the file itself,
 * so that the reply carries the path it was read from and the editor can match
 * a response to the tab that asked for it.
 */
export async function readFile({response, searchParams}) {
  const target = resolveTarget(searchParams, response, {pathRequired: true});

  if (!target) {
    return;
  }

  try {
    const contents = await fs.readFile(target.absolute, 'utf8');
    sendJson(response, 200, {path: target.wantedPath, contents});
  } catch (error) {
    console.error(`Failed to read file: ${target.absolute}; error: ${error}`);
    sendError(response, 404, 'not found');
  }
}

/**
 * GET /files?projectRoot=…&path=…
 *
 * One level of the tree, for the sidebar. `path` is optional here and absent
 * for the project root itself, which is the first thing the editor asks for.
 */
export async function listDirectory({response, searchParams}) {
  const target = resolveTarget(searchParams, response, {pathRequired: false});

  if (!target) {
    return;
  }

  try {
    const entries = await fs.readdir(target.absolute, {withFileTypes: true});
    const contents = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      // Project-relative, so it can be handed straight back as the `path` of
      // the next request without the client knowing where the project lives.
      fullPath: path.join(target.wantedPath, entry.name),
    }));

    sendJson(response, 200, {path: target.wantedPath, contents});
  } catch (error) {
    console.error(`Failed to read directory: ${target.absolute}; error: ${error}`);
    sendError(response, 404, 'not found');
  }
}

/**
 * PUT /file?projectRoot=…&path=…  with `{contents}` as the body
 *
 * The contents travel in the body rather than the query string because a
 * source file is larger than a URL is allowed to be.
 */
export async function writeFile({request, response, searchParams}) {
  const target = resolveTarget(searchParams, response, {pathRequired: true});

  if (!target) {
    return;
  }

  let contents;

  try {
    contents = JSON.parse(await readBody(request)).contents;
  } catch (error) {
    console.error(`Failed to parse request body; error: ${error}`);
    sendError(response, 400, 'invalid request body');
    return;
  }

  try {
    await fs.writeFile(target.absolute, contents, 'utf8');
    sendJson(response, 200, {path: target.wantedPath});
  } catch (error) {
    console.error(`Failed to write file: ${target.absolute}; error: ${error}`);
    sendError(response, 500, 'failed to write file');
  }
}

/**
 * All three routes address a file the same way and turn away the same
 * requests: no project to resolve against, a path the client neglected to
 * send, or one that resolves outside the project.
 *
 * Answers the request itself when it is one of those, and returns null — so a
 * handler's `if (!target) return;` is the whole of its error handling.
 */
function resolveTarget(searchParams, response, {pathRequired}) {
  const projectRoot = searchParams.get('projectRoot');
  const requestedPath = searchParams.get('path');

  if (!projectRoot) {
    sendError(response, 400, 'missing projectRoot parameter');
    return null;
  }

  if (pathRequired && !requestedPath) {
    sendError(response, 400, 'missing path parameter');
    return null;
  }

  const wantedPath = requestedPath || '';
  const absolute = resolveInProject(projectRoot, wantedPath);

  if (!absolute) {
    sendError(response, 400, 'invalid path parameter');
    return null;
  }

  return {absolute, wantedPath};
}
