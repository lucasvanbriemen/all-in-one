import {Pressable, StyleSheet, Text, View} from 'react-native';

import {FileIcon} from '../icons/FileIcon';
import {Icon} from '../icons';
import {NewEntryInput} from './NewEntryInput';
import {fileSystem} from '../fileSystem';
import {showNewEntryMenu} from './showNewEntryMenu';
import {sortFiles} from './sortFiles';
import {useState} from 'react';
import {useThemedStyles} from '../theme';

export function FileNode({projectRoot, folder, onOpenFile, itemsDeep}) {
  const styles = useThemedStyles(createStyles);
  const [children, setChildren] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  // 'file' | 'folder' while this folder's name field is showing.
  const [newEntryKind, setNewEntryKind] = useState(null);

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

    const kind = await showNewEntryMenu();

    if (kind) {
      setNewEntryKind(kind);
    }
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
      <Pressable style={styles.row} onPress={() => handleFileSelect(folder)}>
        {folder.isDirectory ? (
          <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={16} color="black" />
        ) : (
          <View style={styles.chevronSpacer} />
        )}

        <FileIcon name={folder.name} isDirectory={folder.isDirectory} isOpen={isOpen} />

        <Text>{folder.name}</Text>
      </Pressable>

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
  newEntry: {
    marginLeft: 16,
    marginTop: 4,
  },
});
