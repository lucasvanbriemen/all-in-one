import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useState} from 'react';

import {FileNode} from './FileNode';
import {NativeModules} from 'react-native';
import {NewEntryInput} from './NewEntryInput';
import {fileSystem} from '../fileSystem';
import {showNewEntryMenu} from './showNewEntryMenu';
import {sortFiles} from './sortFiles';

export function FileTree({currentFile, onOpenFile, onSave, projectRoot, setProjectRoot, openedFiles, setOpenedFiles}) {
  const styles = useThemedStyles(createStyles);
  const [files, setFiles] = useState([]);
  // 'file' | 'folder' while the root-level name field is showing.
  const [newEntryKind, setNewEntryKind] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, [projectRoot]);

  async function fetchFiles() {
    if (!projectRoot) {
      return;
    }

    const unsortedFiles = await fileSystem.listFiles(projectRoot, '');
    const sortedFiles = sortFiles(unsortedFiles.contents ?? []);
    setFiles(sortedFiles);
  }

  // Right-click anywhere in the tree that isn't a row targets the root.
  // Rows stop the event in FileNode, so they never reach here.
  async function handleContextMenu() {
    if (!projectRoot) {
      return;
    }

    const kind = await showNewEntryMenu();

    if (kind) {
      setNewEntryKind(kind);
    }
  }

  async function createEntry(name) {
    const kind = newEntryKind;
    setNewEntryKind(null);

    if (kind === 'folder') {
      await fileSystem.createFolder(projectRoot, name);
    } else {
      await fileSystem.createFile(projectRoot, name);
    }

    await fetchFiles();

    if (kind === 'file') {
      onOpenFile(name);
    }
  }

  async function openFolder() {
    const path = await NativeModules.FolderPicker.pick();

    if (!path) {
      return;
    }

    setProjectRoot(path);
  }

  return (
    <ScrollView style={styles.editor} contentContainerStyle={styles.editorContent}>
      <Pressable onPress={() => openFolder()} style={[styles.openFoler, !projectRoot && styles.noProjectRootRow]}>
        <Text style={[styles.openFolderText, !projectRoot && styles.noProjectRootRowText]}>Open folder</Text>
      </Pressable>

      <View style={styles.tree} onAuxClick={handleContextMenu}>
      {newEntryKind && (
        <NewEntryInput kind={newEntryKind} onSubmit={createEntry} onCancel={() => setNewEntryKind(null)} />
      )}

      {files.map(file => (
        <FileNode
          projectRoot={projectRoot}
          key={file.fullPath}
          folder={file}
          onOpenFile={onOpenFile}
          onChanged={fetchFiles}
          itemsDeep={0}
        />
      ))}
      </View>
    </ScrollView>
  );
}

const createStyles = colors => StyleSheet.create({
  noProjectRootRow: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noProjectRootRowText: {
    color: colors.onPrimary,
    textAlign: 'center',
  },
  openFoler: {
    marginBottom: 16,
  },
  editorContent: {
    flexGrow: 1,
  },
  tree: {
    flex: 1,
  },
  editor: {
    ...glass(colors, {variant: 'subtle'}),
    marginBottom: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
});
