import path from 'node:path';

// Make sure that the relative path stays within the project root
export function resolveInProject(projectRoot, relativePath) {
  const root = path.resolve(projectRoot);
  const absolute = path.resolve(root, relativePath);

  return contains(root, absolute) ? absolute : null;
}

// Check if the absolute path is contained within the root directory
function contains(root, absolute) {
  const relative = path.relative(root, absolute);

  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
