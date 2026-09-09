import {FoldersToIgnore} from './ignore.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_RESULTS = 25;

export async function searchFileNames(projectRoot, searchTerm) {
  const root = path.resolve(projectRoot);
  const matches = [];

  await searchForFiles(root, searchTerm.toLowerCase(), matches);

  return matches.map(match => path.relative(root, match));
}

async function searchForFiles(directory, searchTermLower, matches) {
  const entries = await fs.readdir(directory, {withFileTypes: true});

  for (const entry of entries) {
    if (matches.length >= MAX_RESULTS) {
      return;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!FoldersToIgnore.includes(entry.name)) {
        await searchForFiles(fullPath, searchTermLower, matches);
      }
      continue;
    }

    if (entry.name.toLowerCase().includes(searchTermLower)) {
      matches.push(fullPath);
    }
  }
}
