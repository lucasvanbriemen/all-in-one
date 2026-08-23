import {Pressable, StyleSheet, Text, View} from 'react-native';

import {FileIcon} from '../icons/FileIcon';
import {Icon} from '../icons';
import {fileSystem} from '../fileSystem';
import {sortFiles} from './sortFiles';
import {useState} from 'react';
import {useThemedStyles} from '../theme';

export function FileNode({projectRoot, folder, onOpenFile, itemsDeep}) {
  const styles = useThemedStyles(createStyles);
  const [children, setChildren] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <View style={[styles.editor, {marginLeft: (16 * (itemsDeep ?? 0))}]}>
      <Pressable style={styles.row} onPress={() => handleFileSelect(folder)}>
        {folder.isDirectory ? (
          <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={16} color="black" />
        ) : (
          <View style={styles.chevronSpacer} />
        )}

        <FileIcon name={folder.name} isDirectory={folder.isDirectory} isOpen={isOpen} />

        <Text>{folder.name}</Text>
      </Pressable>

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
});
