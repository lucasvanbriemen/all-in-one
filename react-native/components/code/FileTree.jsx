import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {CodeEditor} from '../CodeEditor';
import {fileSystem} from '../fileSystem';

export function FileTree({selection, onSelect}) {
  const styles = useThemedStyles(createStyles);
  const [files, setFiles] = useState([]);
  const [source, setSource] = useState('// some comment\n');
  const [currentFile, setCurrentFile] = useState(null);
  const [currentDirectory, setCurrentDirectory] = useState('');

  useEffect(() => {
    fileSystem.listFiles('')
      .then(response => setFiles(response.contents ?? []))
      .catch(console.error);
  }, []);

  function handleFileSelect(file) {
    if (!file.isDirectory) {

      const pathToRead = currentDirectory ? `${currentDirectory}/${file.name}` : file.name;

      fileSystem.readFile(pathToRead)
        .then(response => setSource(response.contents ?? ''))
        .then(() => setCurrentFile(pathToRead))
        .then(() => console.log('contents', source))
        .catch(console.error);
    } else {
      const pathToOpen = currentDirectory ? `${currentDirectory}/${file.name}` : file.name;
      openDirectory(pathToOpen);
      setCurrentDirectory(pathToOpen);
    }
  }

  function openDirectory(path) {
    fileSystem.listFiles(path)
      .then(response => setFiles(response.contents ?? []))
      .catch(console.error);
  }

  function backToRoot() {
    openDirectory('');
    setCurrentDirectory('');
  }

  return (
    <View style={styles.editor}>
      <Text onPress={() => fileSystem.writeFile(currentFile, source)}>save</Text>
      {currentDirectory && (
        <Text onPress={backToRoot}>Back to root</Text>
      )}
      {files.map(file => (
        <Text key={file.name} onPress={() => handleFileSelect(file)}>{file.name}</Text>
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
