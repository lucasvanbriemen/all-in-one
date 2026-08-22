import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useState} from 'react';

import {FileNode} from './FileNode';
import {fileSystem} from '../fileSystem';
import {folderPicker} from '../folderPicker';
import {sortFiles} from './sortFiles';

export function FileTree({root, currentFile, onOpenFile, onOpenFolder}) {
  const styles = useThemedStyles(createStyles);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!root) {
      return;
    }

    async function fetchFiles() {
      const unsortedFiles = await fileSystem.listFiles('');
      const sortedFiles = sortFiles(unsortedFiles.contents ?? []);
      setFiles(sortedFiles);
    }

    fetchFiles();
  }, [root]);

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
      <View style={styles.header}>
        <Text style={styles.root} numberOfLines={1}>
          {root ? folderName(root) : 'Connecting…'}
        </Text>

        <Text style={styles.openFolder} onPress={onOpenFolder}>Open…</Text>
      </View>

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

/** The last segment of the root, which is what the folder is called. */
function folderName(root) {
  return root.split('/').filter(Boolean).pop() ?? root;
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  root: {
    color: colors.onSurface,
    fontWeight: '600',
    flexShrink: 1,
  },
  openFolder: {
    color: colors.primary,
  },
});
