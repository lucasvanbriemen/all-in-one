import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {FileNode} from './FileNode';
import {fileSystem} from '../fileSystem';

export function FolderNode({folder, setSource, currentFile, setCurrentFile}) {
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
      <Text key={folder.name} onPress={() => handleFileSelect(folder)}>FOLDER: {folder.name} {folder?.items?.length}</Text>

      {folder.isDirectory && folder.items?.map(subFile => (
        <FolderNode
          key={subFile.fullPath}
          folder={subFile}
          setSource={setSource}
          currentFile={currentFile}
          setCurrentFile={setCurrentFile}
        />
      ))}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  editor: {
    marginBottom: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
});
