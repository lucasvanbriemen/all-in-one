import {FoldersToIgnore} from './ignore.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {resolveInProject} from '../projectPaths.mjs';

// Non readable files
const ExtensionsToIgnore = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.icns', '.svgz',
  '.pdf', '.zip', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.jar', '.tar',
  '.mp3', '.mp4', '.mov', '.avi', '.wav', '.webm', '.ogg',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.so', '.dylib', '.dll', '.exe', '.o', '.a', '.class', '.pyc', '.wasm',
  '.db', '.sqlite', '.sqlite3', '.lock', '.map',
]);

const MAX_CODE_RESULTS = 500;
const MAX_MATCHES_PER_FILE = 50;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PREVIEW_LENGTH = 400;

/**
 * One RegExp for both searching and replacing, so the two agree on what a
 * match is. A plain term is escaped; `wholeWord` wraps it in boundaries.
 */
export function buildMatcher(term, {caseSensitive = false, regex = false, wholeWord = false} = {}) {
  let source = regex ? term : term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (wholeWord) {
    source = `\\b(?:${source})\\b`;
  }

  return new RegExp(source, caseSensitive ? 'g' : 'gi');
}

export async function searchCode(projectRoot, searchTerm, options = {}) {
  const root = path.resolve(projectRoot);
  const results = [];
  const matcher = buildMatcher(searchTerm, options);

  await walk(root, root, async (absolute, relative) => {
    if (results.length >= MAX_CODE_RESULTS) {
      return false;
    }

    const contents = await readText(absolute);

    if (contents == null) {
      return true;
    }

    const lines = contents.split('\n');
    let matchesInFile = 0;

    for (let index = 0; index < lines.length; index++) {
      if (matchesInFile >= MAX_MATCHES_PER_FILE || results.length >= MAX_CODE_RESULTS) {
        break;
      }

      const line = lines[index].replace(/\r$/, '');
      matcher.lastIndex = 0;
      const match = matcher.exec(line);

      if (!match) {
        continue;
      }

      results.push({
        path: relative,
        line: index + 1,
        column: match.index + 1,
        length: match[0].length,
        text: line.length > MAX_PREVIEW_LENGTH ? line.slice(0, MAX_PREVIEW_LENGTH) : line,
      });
      matchesInFile++;
    }

    return true;
  });

  return results;
}

export async function replaceInFiles(projectRoot, term, replacement, options = {}) {
  const root = path.resolve(projectRoot);
  const matcher = buildMatcher(term, options);
  const changed = [];
  let replacements = 0;

  const targets = options.paths
    ? options.paths
        .map(relative => ({absolute: resolveInProject(root, relative), relative}))
        .filter(target => target.absolute)
    : null;

  const visit = async (absolute, relative) => {
    const contents = await readText(absolute);

    if (contents == null) {
      return true;
    }

    let count = 0;
    const next = contents.replace(matcher, (...args) => {
      count++;
      // A regex replacement may use $1 etc.; a plain one is literal.
      return options.regex ? substitute(replacement, args) : replacement;
    });

    if (count > 0) {
      await fs.writeFile(absolute, next, 'utf8');
      changed.push({path: relative, replacements: count});
      replacements += count;
    }

    return true;
  };

  if (targets) {
    for (const target of targets) {
      await visit(target.absolute, target.relative);
    }
  } else {
    await walk(root, root, visit);
  }

  return {changed, replacements};
}

/** `String.replace` with a function loses `$1` expansion; this puts it back. */
function substitute(template, args) {
  const groups = args.slice(0, -2);

  return template.replace(/\$(\d+|&)/g, (_, token) => {
    if (token === '&') {
      return groups[0];
    }

    return groups[Number(token)] ?? '';
  });
}

async function readText(absolute) {
  if (ExtensionsToIgnore.has(path.extname(absolute).toLowerCase())) {
    return null;
  }

  const stats = await fs.stat(absolute);

  if (stats.size > MAX_FILE_BYTES) {
    return null;
  }

  const contents = await fs.readFile(absolute, 'utf8');

  if (contents.includes('\u0000')) {
    return null;
  }

  return contents;
}

/** Depth-first over the readable files; `visit` returns false to stop early. */
async function walk(directory, root, visit) {
  let entries;

  try {
    entries = await fs.readdir(directory, {withFileTypes: true});
  } catch (error) {
    console.error(`Skipping unreadable directory: ${directory}; error: ${error}`);
    return true;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!FoldersToIgnore.includes(entry.name)) {
        const keepGoing = await walk(fullPath, root, visit);

        if (!keepGoing) {
          return false;
        }
      }
      continue;
    }

    // Exclude symlinks
    if (!entry.isFile()) {
      continue;
    }

    const keepGoing = await visit(fullPath, path.relative(root, fullPath));

    if (!keepGoing) {
      return false;
    }
  }

  return true;
}
