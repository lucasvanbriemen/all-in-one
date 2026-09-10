import {FoldersToIgnore} from './ignore.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

// Non readable files
const ExtensionsToIgnore = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.icns', '.svgz',
  '.pdf', '.zip', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.jar', '.tar',
  '.mp3', '.mp4', '.mov', '.avi', '.wav', '.webm', '.ogg',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.so', '.dylib', '.dll', '.exe', '.o', '.a', '.class', '.pyc', '.wasm',
  '.db', '.sqlite', '.sqlite3', '.lock', '.map',
]);

const MAX_CODE_RESULTS = 200;
const MAX_MATCHES_PER_FILE = 20;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PREVIEW_LENGTH = 400;

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

    // Exclude symlinks
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

  const stats = await fs.stat(absolutePath);

  if (stats.size > MAX_FILE_BYTES) {
    return;
  }

  contents = await fs.readFile(absolutePath, 'utf8');

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

    const line = lines[index].replace(/\r$/, '');
    const column = line.toLowerCase().indexOf(searchTermLower);

    if (column === -1) {
      continue;
    }

    results.push({
      path: relative,
      line: index + 1,
      column: column + 1,
      text: line.length > MAX_PREVIEW_LENGTH ? line.slice(0, MAX_PREVIEW_LENGTH) : line,
    });
    matchesInFile++;
  }
}
