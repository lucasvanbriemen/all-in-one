import {HttpError} from './http.mjs';
import path from 'node:path';

// Make sure that the relative path stays within the project root
export function resolveInProject(projectRoot, relativePath) {
  if (!projectRoot) {
    return null;
  }

  const root = path.resolve(projectRoot);
  const absolute = path.resolve(root, relativePath ?? '');

  return contains(root, absolute) ? absolute : null;
}

/**
 * The handlers' view of a request: the project it is about, the path inside
 * it, and where that is on disk. A path that escapes the project, or a request
 * with no project at all, is refused here so no handler has to remember to.
 */
export function resolveTarget(searchParams, key = 'path') {
  const projectRoot = searchParams.get('projectRoot');
  const wantedPath = searchParams.get(key) || '';

  if (!projectRoot) {
    throw new HttpError(400, 'projectRoot is required');
  }

  const absolute = resolveInProject(projectRoot, wantedPath);

  if (!absolute) {
    throw new HttpError(400, `Path escapes the project: ${wantedPath}`);
  }

  return {projectRoot: path.resolve(projectRoot), absolute, wantedPath};
}

// Check if the absolute path is contained within the root directory
function contains(root, absolute) {
  const relative = path.relative(root, absolute);

  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
