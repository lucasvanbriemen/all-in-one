import path from 'node:path';

/**
 * Every path this server touches arrives as two query parameters — the project
 * the editor has open, and something relative to it — and a client is free to
 * send a relative path that climbs back out of the project. Resolving and then
 * proving containment lives here so that no route has to remember to do it.
 *
 * Returns the absolute path, or null if it would land outside the project.
 */
export function resolveInProject(projectRoot, relativePath) {
  if (relativePath.includes('..')) {
    return null;
  }

  const root = path.resolve(projectRoot);
  const absolute = path.resolve(root, relativePath);

  return contains(root, absolute) ? absolute : null;
}

/**
 * Containment is decided on path segments rather than on string prefix: a
 * prefix test accepts `/project-backup/secrets` for a root of `/project`,
 * since that is what the root's own characters spell. The route back out of
 * `root` to `absolute` climbing upwards is the thing that actually disqualifies
 * a path.
 */
function contains(root, absolute) {
  const relative = path.relative(root, absolute);

  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
