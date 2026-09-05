import {DraftRow, TreeRow} from './TreeRow';

import {View} from 'react-native';
import {useFileTree} from './fileTreeContext';

/**
 * One entry, plus whatever is under it. A folder's contents come from the
 * shared tree rather than from state of its own, so a row redrawn after an
 * edit is the same code path as a row drawn for the first time.
 */
export function FileNode({entry, depth}) {
  const {expanded, draft, toggleDirectory, onOpenFile} = useFileTree();

  if (draft?.mode === 'rename' && draft.targetPath === entry.fullPath) {
    return <DraftRow depth={depth} />;
  }

  const isOpen = Boolean(expanded[entry.fullPath]);

  function open() {
    if (entry.isDirectory) {
      return toggleDirectory(entry.fullPath);
    }

    return onOpenFile?.(entry.fullPath);
  }

  return (
    <View>
      <TreeRow entry={entry} depth={depth} isOpen={isOpen} onPress={open} />

      {entry.isDirectory && isOpen && <DirectoryContents directoryPath={entry.fullPath} depth={depth + 1} />}
    </View>
  );
}

/**
 * The contents of one directory, root included — `''` is the project itself,
 * which is why the top level needs no special case here or in `FileTree`.
 *
 * A new entry is named in place, at the top of the folder it is being made in,
 * so the field is somewhere predictable instead of wherever the finished name
 * would eventually sort to.
 */
export function DirectoryContents({directoryPath, depth}) {
  const {entries, draft} = useFileTree();

  const isNamingHere = draft?.mode === 'create' && draft.parentPath === directoryPath;

  return (
    <>
      {isNamingHere && <DraftRow depth={depth} />}

      {(entries[directoryPath] ?? []).map(entry => (
        <FileNode key={entry.fullPath} entry={entry} depth={depth} />
      ))}
    </>
  );
}
