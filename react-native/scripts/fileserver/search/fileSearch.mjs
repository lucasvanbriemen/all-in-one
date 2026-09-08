import {FoldersToIgnore} from './ignore.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

/** What the modal can list before a list stops being one. */
const MAX_RESULTS = 25;

/**
 * Filename search: every file under the project whose name contains the term.
 *
 * Answers with paths relative to the project root, which is both what the
 * modal shows and what the file routes take back as their `path` parameter.
 */
export async function searchFileNames(projectRoot, searchTerm) {
  const root = path.resolve(projectRoot);
  const matches = [];

  await walk(root, searchTerm.toLowerCase(), matches);

  return matches.map(match => path.relative(root, match));
}

async function walk(directory, searchTermLower, matches) {
  const entries = await fs.readdir(directory, {withFileTypes: true});

  for (const entry of entries) {
    if (matches.length >= MAX_RESULTS) {
      return;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!FoldersToIgnore.includes(entry.name)) {
        await walk(fullPath, searchTermLower, matches);
      }
      continue;
    }

    if (entry.name.toLowerCase().includes(searchTermLower)) {
      matches.push(fullPath);
    }
  }
}
