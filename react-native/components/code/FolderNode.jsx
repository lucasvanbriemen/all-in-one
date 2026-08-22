import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {fileSystem} from '../fileSystem';

export function FolderNode({source, setSource, currentFile, setCurrentFile}) {
  const styles = useThemedStyles(createStyles);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fileSystem.listFiles('')
      .then(response => setFiles(response.contents ?? []))
      .catch(console.error);
  }, []);

  function handleFileSelect(file) {
    if (file.isDirectory) {
      return openDirectory(file);
    }
    const pathToRead = file.fullPath;

    fileSystem.readFile(pathToRead)
      .then(response => setSource(response.contents ?? ''))
      .then(() => setCurrentFile(pathToRead))
      .then(() => console.log('contents', source))
      .catch(console.error);
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
    <View style={styles.editor}>
      <Text onPress={() => fileSystem.writeFile(currentFile, source)}>save</Text>
      {files.map(file => (
        <View key={file.name}>
          <Text key={file.name} onPress={() => handleFileSelect(file)}>{file.name} {file?.items?.length}</Text>

          {file?.items?.length > 0 && file.items.map(subFile => (
            <Text key={subFile.name} onPress={() => handleFileSelect(subFile)} style={{marginLeft: 16}}>{subFile.name}</Text>
          ))}
        </View>
      ))}
    </View>
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
