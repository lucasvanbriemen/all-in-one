import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useState} from 'react';

import {FileNode} from './FileNode';
import {fileSystem} from '../fileSystem';

export function FileTree({currentFile, onOpenFile, onSave}) {
  const styles = useThemedStyles(createStyles);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    async function fetchFiles() {
      const unsortedFiles = await fileSystem.listFiles('');
      sortFiles(unsortedFiles.contents ?? []);
    }

    function sortFiles(unsortedFiles) {
      // First we sort them by folder vs file, then by name. This is a simple sort that will put all folders first, then files, and within each group, they will be sorted alphabetically.
      const sortedFiles = unsortedFiles.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) {
          return -1;
        }
        if (!a.isDirectory && b.isDirectory) {
          return 1;
        }
        return a.name.localeCompare(b.name);
      });

      setFiles(sortedFiles);
    }

    fetchFiles();
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
