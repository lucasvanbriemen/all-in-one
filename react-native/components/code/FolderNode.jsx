import {StyleSheet, Text, View} from 'react-native';

import {fileSystem} from '../fileSystem';
import {useState} from 'react';
import {useThemedStyles} from '../theme';

export function FolderNode({folder, source, setSource, currentFile, setCurrentFile, itemsDeep}) {
  const styles = useThemedStyles(createStyles);
  const [children, setChildren] = useState([]);

  function handleFileSelect(file) {
    if (file.isDirectory) {
      if (children.length > 0) {
        return setChildren([]);
      }

      return openDirectory();
    }
    const pathToRead = file.fullPath;

    fileSystem.readFile(pathToRead)
      .then(response => setSource(response.contents ?? ''))
      .then(() => setCurrentFile(pathToRead))
  }

  async function openDirectory() {
    const response = await fileSystem.listFiles(folder.fullPath);
    setChildren(response.contents ?? []);
  }

  return (
    <View style={[styles.editor, {marginLeft: (16 * (itemsDeep ?? 0))}]}>
      <Text key={folder.name} onPress={() => handleFileSelect(folder)}>{folder.isDirectory ? "Folder:" : "File:"} {folder.name}</Text>

      {children?.map(subFile => (
        <FolderNode
          key={subFile.fullPath}
          folder={subFile}
          source={source}
          setSource={setSource}
          currentFile={currentFile}
          setCurrentFile={setCurrentFile}
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
