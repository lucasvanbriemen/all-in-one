import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useState} from 'react';

import {FileNode} from './FileNode';
import {NativeModules} from 'react-native';
import {fileSystem} from '../fileSystem';
import {sortFiles} from './sortFiles';

export function FileTree({currentFile, onOpenFile, onSave, projectRoot, setProjectRoot, openedFiles, setOpenedFiles}) {
  const styles = useThemedStyles(createStyles);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    async function fetchFiles() {
      const unsortedFiles = await fileSystem.listFiles(projectRoot, '');
      const sortedFiles = sortFiles(unsortedFiles.contents ?? []);
      setFiles(sortedFiles);
    }

    fetchFiles();
  }, [projectRoot]);

  function handleFileSelect(file) {
    if (file.isDirectory) {
      return openDirectory(file);
    }

    return onOpenFile(file.fullPath);
  }

  async function openDirectory(file) {
    const pathToOpen = file.fullPath;

    const response = await fileSystem.listFiles(projectRoot, pathToOpen);
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
    console.log('opened directory', file.name, folderItems);
  }

  async function openFolder() {
    console.log('opening folder');
    const path = await NativeModules.FolderPicker.pick();

    if (!path) {
      return;
    }

    setProjectRoot(path);
  }

  return (
    <ScrollView style={styles.editor}>
      <Pressable onPress={() => openFolder()}>
        <Text>Open folder</Text>
      </Pressable>

      {files.map(file => (
        <View key={file.name}>
          {!file.isDirectory && (
            <Text key={file.name} onPress={() => handleFileSelect(file)}>File: {file.name}</Text>
          )}

          {file.isDirectory && (
            <FileNode
              projectRoot={projectRoot}
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
