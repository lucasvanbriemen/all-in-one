import {StyleSheet, Text, View} from 'react-native';

import {fileSystem} from '../fileSystem';
import {sortFiles} from './sortFiles';
import {useState} from 'react';
import {useThemedStyles} from '../theme';

export function FileNode({projectRoot, folder, onOpenFile, itemsDeep}) {
  const styles = useThemedStyles(createStyles);
  const [children, setChildren] = useState([]);

  function handleFileSelect(file) {
    if (file.isDirectory) {
      if (children.length > 0) {
        return setChildren([]);
      }

      return openDirectory();
    }

    return onOpenFile(file.fullPath);
  }

  async function openDirectory() {
    const unsortedItems = await fileSystem.listFiles(projectRoot, folder.fullPath);
    const sortedFiles = sortFiles(unsortedItems.contents ?? []);

    setChildren(sortedFiles);
  }

  return (
    <View style={[styles.editor, {marginLeft: (16 * (itemsDeep ?? 0))}]}>
      <Text key={folder.name} onPress={() => handleFileSelect(folder)}>{folder.isDirectory ? "Folder:" : "File:"} {folder.name}</Text>

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
  },
});
