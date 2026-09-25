import {FoldersToIgnore} from './ignore.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_RESULTS = 50;

/**
 * Fuzzy in the way editors are: every character of the term has to appear in
 * the path in order, and a match that lands on the file name, or on word
 * starts, ranks above one scattered through directory names.
 */
export function fuzzyScore(term, candidate) {
  const needle = term.toLowerCase();
  const haystack = candidate.toLowerCase();

  if (!needle) {
    return 1;
  }

  // The cheap case first: a substring match, best when it is the whole name.
  const name = haystack.slice(haystack.lastIndexOf('/') + 1);
  if (name === needle) {
    return 1000;
  }
  if (name.startsWith(needle)) {
    return 800;
  }
  if (name.includes(needle)) {
    return 600 - (name.length - needle.length);
  }
  if (haystack.includes(needle)) {
    return 400 - (haystack.length - needle.length) / 4;
  }

  let score = 0;
  let position = 0;

  for (const character of needle) {
    const found = haystack.indexOf(character, position);

    if (found === -1) {
      return 0;
    }

    const previous = haystack[found - 1];
    const boundary = found === 0 || previous === '/' || previous === '.' || previous === '_' || previous === '-';
    score += boundary ? 10 : 1;
    score -= (found - position) / 10;
    position = found + 1;
  }

  return Math.max(1, score);
}

export async function searchFileNames(projectRoot, searchTerm) {
  const root = path.resolve(projectRoot);
  const matches = [];

  await collect(root, root, searchTerm, matches);

  matches.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  return matches.slice(0, MAX_RESULTS).map(match => ({path: match.path}));
}

async function collect(directory, root, term, matches) {
  let entries;

  try {
    entries = await fs.readdir(directory, {withFileTypes: true});
  } catch (error) {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!FoldersToIgnore.includes(entry.name)) {
        await collect(fullPath, root, term, matches);
      }
      continue;
    }

    const relative = path.relative(root, fullPath);
    const score = fuzzyScore(term, relative);

    if (score > 0) {
      matches.push({path: relative, score});
    }
  }
}
