import {Pressable, StyleSheet, Text, View} from 'react-native';

import {FileIcon} from '../icons/FileIcon';
import {Icon} from '../icons';
import {NewEntryInput} from './NewEntryInput';
import {fileSystem} from '../fileSystem';
import {showNewEntryMenu} from './showNewEntryMenu';
import {sortFiles} from './sortFiles';
import {useState} from 'react';
import {useThemedStyles} from '../theme';

export function FileNode({projectRoot, folder, onOpenFile, onChanged, itemsDeep}) {
  const styles = useThemedStyles(createStyles);
  const [children, setChildren] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newEntryKind, setNewEntryKind] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);

  function handleFileSelect(file) {
    if (file.isDirectory) {
      if (isOpen) {
        setIsOpen(false);
        return setChildren([]);
      }

      setIsOpen(true);
      return openDirectory();
    }

    return onOpenFile(file.fullPath);
  }

  async function openDirectory() {
    const unsortedItems = await fileSystem.listFiles(projectRoot, folder.fullPath);
    const sortedFiles = sortFiles(unsortedItems.contents ?? []);
    setChildren(sortedFiles);
    setIsOpen(true);
  }

  async function handleContextMenu(event) {
    event.stopPropagation();

    const kind = await showNewEntryMenu(folder);

    if (kind === 'rename') {
      setIsRenaming(true);
    } else if (kind === 'delete') {
      await fileSystem.deleteEntry(projectRoot, folder.fullPath);
      await onChanged?.();
    } else if (kind) {
      setNewEntryKind(kind);
    }
  }

  async function renameEntry(name) {
    setIsRenaming(false);

    const parent = folder.fullPath.slice(0, folder.fullPath.length - folder.name.length);
    const newPath = `${parent}${name}`;

    await fileSystem.renameEntry(projectRoot, folder.fullPath, newPath);
    await onChanged?.();
  }

  async function createEntry(name) {
    const kind = newEntryKind;
    const path = `${folder.fullPath}/${name}`;
    setNewEntryKind(null);

    if (kind === 'folder') {
      await fileSystem.createFolder(projectRoot, path);
    } else {
      await fileSystem.createFile(projectRoot, path);
    }

    await openDirectory();

    if (kind === 'file') {
      onOpenFile(path);
    }
  }

  return (
    <View style={[styles.editor, {marginLeft: (16 * (itemsDeep ?? 0))}]} onAuxClick={handleContextMenu}>
      {isRenaming ? (
        <NewEntryInput
          kind={folder.isDirectory ? 'folder' : 'file'}
          initialName={folder.name}
          onSubmit={renameEntry}
          onCancel={() => setIsRenaming(false)}
        />
      ) : (
        <Pressable style={styles.row} onPress={() => handleFileSelect(folder)}>
          {folder.isDirectory ? (
            <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={16} color="black" />
          ) : (
            <View style={styles.chevronSpacer} />
          )}

          <FileIcon name={folder.name} isDirectory={folder.isDirectory} isOpen={isOpen} />

          <Text>{folder.name}</Text>
        </Pressable>
      )}

      {newEntryKind && (
        <View style={styles.newEntry}>
          <NewEntryInput kind={newEntryKind} onSubmit={createEntry} onCancel={() => setNewEntryKind(null)} />
        </View>
      )}

      {children?.map(subFile => (
        <FileNode
          projectRoot={projectRoot}
          key={subFile.fullPath}
          folder={subFile}
          onOpenFile={onOpenFile}
          onChanged={openDirectory}
          itemsDeep={(itemsDeep ?? 0) + 1}
        />
      ))}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  editor: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  chevronSpacer: {
    width: 16,
  },
  newEntry: {
    marginLeft: 16,
    marginTop: 4,
  },
});
