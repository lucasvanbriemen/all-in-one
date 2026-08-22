import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {FileNode} from './FileNode';
import {fileSystem} from '../fileSystem';

export function FolderNode({folder, source, setSource, currentFile, setCurrentFile, itemsDeep}) {
  const styles = useThemedStyles(createStyles);
  const [children, setChildren] = useState([]);

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

    let updatedFiles = [...children];
    updatedFiles = updatedFiles.map(f => {
      if (f.name === file.name) {
        return file;
      }

      return f;
    });
    setChildren(updatedFiles);
  }

  return (
    <View style={[styles.editor, {marginLeft: (16 * (itemsDeep ?? 0))}]}>
      <Text key={folder.name} onPress={() => handleFileSelect(folder)}>{folder.isDirectory ? "Folder:" : "File:"} {folder.name}</Text>

      {folder.isDirectory && children?.map(subFile => (
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
