export function sortFiles(unsortedFiles) {
  return unsortedFiles.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) {
      return -1;
    }

    if (!a.isDirectory && b.isDirectory) {
      return 1;
    }

    return a.name.localeCompare(b.name);
  });
}
