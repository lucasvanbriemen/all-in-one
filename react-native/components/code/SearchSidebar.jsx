import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useState} from 'react';

import {FileIcon} from '../icons/FileIcon';
import {FileNode} from './FileNode';
import {NativeModules} from 'react-native';
import {fileSystem} from '../fileSystem';
import {sortFiles} from './sortFiles';
import {useRef} from 'react';

export function SearchSidebar({currentFile, onOpenFile, onSave, projectRoot, setProjectRoot, openedFiles, setOpenedFiles}) {
  const styles = useThemedStyles(createStyles);
  const [files, setFiles] = useState([]);

  const inputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');

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
  }

  async function openFolder() {
    const path = await NativeModules.FolderPicker.pick();

    if (!path) {
      return;
    }

    setProjectRoot(path);
  }

  return (
    <ScrollView style={styles.editor}>
      <TextInput ref={inputRef} style={styles.input} placeholder="Looking for something?" enableFocusRing={false} value={searchTerm}onChangeText={setSearchTerm} />
    </ScrollView>
  );
}

const createStyles = colors => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    marginBottom: 4,
  },
  chevronSpacer: {
    width: 16,
  },
  editor: {
    ...glass(colors, {tint: 0.25}),
    marginBottom: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
});
