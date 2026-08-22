import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {fileSystem} from '../fileSystem';

export function FileTree({source, setSource, currentFile, setCurrentFile}) {
  const styles = useThemedStyles(createStyles);
  const [files, setFiles] = useState([]);
  const [currentDirectory, setCurrentDirectory] = useState('');

  useEffect(() => {
    fileSystem.listFiles('')
      .then(response => setFiles(response.contents ?? []))
      .catch(console.error);
  }, []);

  function handleFileSelect(file) {
    console.log('file selected', file);
    console.log('all files', files);
    if (!file.isDirectory) {
      const pathToRead = currentDirectory ? `${currentDirectory}/${file.name}` : file.name;

      fileSystem.readFile(pathToRead)
        .then(response => setSource(response.contents ?? ''))
        .then(() => setCurrentFile(pathToRead))
        .then(() => console.log('contents', source))
        .catch(console.error);
    } else {
      const pathToOpen = currentDirectory ? `${currentDirectory}/${file.name}` : file.name;
      openDirectory(file);
      setCurrentDirectory(pathToOpen);
    }
  }

  async function openDirectory(file) {
    const pathToOpen = currentDirectory ? `${currentDirectory}/${file.name}` : file.name;

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
        <Text key={file.name} onPress={() => handleFileSelect(file)}>{file.name} {file?.items?.length}</Text>
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
