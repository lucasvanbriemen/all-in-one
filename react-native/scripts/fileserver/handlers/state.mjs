import {readJson, sendJson} from '../http.mjs';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * The editor's memory between launches: recent projects and the tabs open in
 * each. One JSON file, owned by the client — the server
 * stores what it is given and hands it back, nothing more.
 */
export const STATE_DIRECTORY = process.env.AIO_STATE_DIR || path.join(os.homedir(), '.all-in-one');
const STATE_FILE = 'editor-state.json';

export function stateFile() {
  return path.join(STATE_DIRECTORY, STATE_FILE);
}

export async function readState() {
  try {
    return JSON.parse(await fs.readFile(stateFile(), 'utf8'));
  } catch (error) {
    return {};
  }
}

export async function writeState(state) {
  await fs.mkdir(STATE_DIRECTORY, {recursive: true});
  // Written beside and renamed over, so a crash mid-write leaves the old
  // state rather than half a file.
  const temporary = `${stateFile()}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(state, null, 2), 'utf8');
  await fs.rename(temporary, stateFile());
}

export async function getState({response}) {
  sendJson(response, await readState());
}

export async function putState({request, response}) {
  const state = await readJson(request);
  await writeState(state);
  sendJson(response, {ok: true});
}

/** Merge a few keys in rather than replacing the whole file. */
export async function patchState({request, response}) {
  const patch = await readJson(request);
  const state = {...(await readState()), ...patch};
  await writeState(state);
  sendJson(response, state);
}
