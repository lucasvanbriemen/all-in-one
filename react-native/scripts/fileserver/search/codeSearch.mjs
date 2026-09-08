import {FoldersToIgnore} from './ignore.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Reading a binary as utf8 costs exactly what reading source costs and can only
 * produce hits nobody wants to open, so the common ones are turned away on
 * their extension before the file is ever opened. A file with no extension —
 * `Makefile`, `.gitignore`, a shell script — is source until proven otherwise,
 * and the NUL check below is what proves it.
 */
const ExtensionsToIgnore = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.icns', '.svgz',
  '.pdf', '.zip', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.jar', '.tar',
  '.mp3', '.mp4', '.mov', '.avi', '.wav', '.webm', '.ogg',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.so', '.dylib', '.dll', '.exe', '.o', '.a', '.class', '.pyc', '.wasm',
  '.db', '.sqlite', '.sqlite3', '.lock', '.map',
]);

/**
 * Three separate budgets, because they stop three different things going wrong.
 * The total is what the modal can show before the list stops being a list; the
 * per-file cap keeps one generated file from spending that whole total on
 * itself; and the size cap steps around minified bundles, which are a single
 * multi-megabyte line and therefore all cost and no answer.
 */
const MAX_CODE_RESULTS = 200;
const MAX_MATCHES_PER_FILE = 20;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PREVIEW_LENGTH = 400;

/**
 * Unlike `searchFileNames`, which answers with paths, this answers with
 * positions: every hit carries the line and column it was found at, so the
 * editor can open the file *and* put the caret on the match rather than at the
 * top.
 */
export async function searchCode(projectRoot, searchTerm) {
  const root = path.resolve(projectRoot);
  const results = [];

  await searchDirectory(root, searchTerm.toLowerCase(), root, results);

  return results;
}

async function searchDirectory(directory, searchTermLower, projectRoot, results) {
  let entries;

  try {
    entries = await fs.readdir(directory, {withFileTypes: true});
  } catch (error) {
    // A directory we are not allowed to open is a directory with no matches in
    // it; one unreadable folder should not fail the whole search.
    console.error(`Skipping unreadable directory: ${directory}; error: ${error}`);
    return;
  }

  for (const entry of entries) {
    if (results.length >= MAX_CODE_RESULTS) {
      return;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!FoldersToIgnore.includes(entry.name)) {
        await searchDirectory(fullPath, searchTermLower, projectRoot, results);
      }
      continue;
    }

    // Symlinks are deliberately not followed: they are the one entry that can
    // point back up the tree and turn this walk into a loop.
    if (!entry.isFile()) {
      continue;
    }

    if (ExtensionsToIgnore.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    await searchFile(fullPath, searchTermLower, projectRoot, results);
  }
}

async function searchFile(absolutePath, searchTermLower, projectRoot, results) {
  let contents;

  try {
    const stats = await fs.stat(absolutePath);

    if (stats.size > MAX_FILE_BYTES) {
      return;
    }

    contents = await fs.readFile(absolutePath, 'utf8');
  } catch (error) {
    // Same bargain as above: an unreadable file is a file without matches.
    return;
  }

  // What the extension list missed. Text files do not contain NUL; binaries
  // read as utf8 almost always do, within the first few hundred bytes.
  if (contents.includes('\u0000')) {
    return;
  }

  const relative = path.relative(projectRoot, absolutePath);
  const lines = contents.split('\n');
  let matchesInFile = 0;

  for (let index = 0; index < lines.length; index++) {
    if (matchesInFile >= MAX_MATCHES_PER_FILE || results.length >= MAX_CODE_RESULTS) {
      return;
    }

    // Only the first hit on a line is reported. A second one on the same line
    // is the same line to open, and the modal would show the row twice.
    const line = lines[index].replace(/\r$/, '');
    const column = line.toLowerCase().indexOf(searchTermLower);

    if (column === -1) {
      continue;
    }

    results.push({
      path: relative,
      // Editors count from one; `indexOf` and the loop count from zero.
      line: index + 1,
      column: column + 1,
      // A preview for the results list, not the line itself — a long line is
      // cut here, while `line` and `column` still address the real file.
      text: line.length > MAX_PREVIEW_LENGTH ? line.slice(0, MAX_PREVIEW_LENGTH) : line,
    });
    matchesInFile++;
  }
}
