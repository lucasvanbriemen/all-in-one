/**
 * Both searches walk the same tree, so they skip the same folders: the ones
 * whose contents are generated, vendored, or the repository's own bookkeeping.
 */
export const FoldersToIgnore = ['node_modules', '.git', 'build', 'dist', 'out', 'venv', '__pycache__'];
