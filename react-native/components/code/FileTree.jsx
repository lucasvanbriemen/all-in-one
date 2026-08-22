import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useState} from 'react';

import {FileNode} from './FileNode';
import {fileSystem} from '../fileSystem';

export function FileTree({currentFile, onOpenFile, onSave}) {
  const styles = useThemedStyles(createStyles);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fileSystem.listFiles('')
      .then(response => setFiles(response.contents ?? []))
  }, []);

  function handleFileSelect(file) {
    if (file.isDirectory) {
      return openDirectory(file);
    }

    return onOpenFile(file.fullPath);
  }

  async function openDirectory(file) {
    const pathToOpen = file.fullPath;

    const response = await fileSystem.listFiles(pathToOpen);
    const folderItems = response.contents ?? [];

    file.items = folderItems;

    let updatedFiles = [...files];
    updatedFiles = updatedFiles.map(f => {
      if (f.name === file.name) {
        return file;
      }

      return f;
    });
    setFiles(updatedFiles);
  }

  return (
    <ScrollView style={styles.editor}>
      {/* Wrapped, so the press event is not handed to `save` as the contents
          to write. */}
      <Text onPress={() => onSave()}>save</Text>
      {files.map(file => (
        <View key={file.name}>
          {!file.isDirectory && (
            <Text key={file.name} onPress={() => handleFileSelect(file)}>File: {file.name}</Text>
          )}

          {file.isDirectory && (
            <FileNode
              key={file.fullPath}
              folder={file}
              onOpenFile={onOpenFile}
              itemsDeep={0}
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = colors => StyleSheet.create({
  editor: {
    ...glass(colors, {tint: 0.25}),
    marginBottom: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
});
