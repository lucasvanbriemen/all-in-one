import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {CodeEditor} from '../CodeEditor';
import {FileTree} from './FileTree';
import {fileSystem} from '../fileSystem';

export function CodePage({selection, onSelect}) {
  const styles = useThemedStyles(createStyles);
  const [source, setSource] = useState('// some comment\n');
  const [currentFile, setCurrentFile] = useState(null);

  function save() {
    fileSystem.writeFile(currentFile, source).catch(console.error);
  }

  return (
    <View style={styles.editor}>
      <View style={styles.fileTree}>
        <FileTree currentFile={currentFile} setCurrentFile={setCurrentFile} setSource={setSource} />
      </View>

      <View style={styles.codeEditorContainer}>
        {/* Saving lives with the buffer rather than with the tree: the tree
            only ever hands a file over, it doesn't hold the edits. */}
        <View style={styles.toolbar}>
          <Text style={styles.path} numberOfLines={1}>
            {currentFile ?? 'No file open'}
          </Text>

          <Pressable onPress={save} disabled={!currentFile} style={[styles.save, !currentFile && styles.saveDisabled]}>
            <Text style={styles.saveLabel}>Save</Text>
          </Pressable>
        </View>

        <CodeEditor value={source} path={currentFile} onChange={setSource} />
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  editor: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  codeEditorContainer: {
    flex: 4,
    ...glass(colors, {tint: 0.25}),
    marginBottom: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
  },
  fileTree: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  path: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  save: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: colors.primary,
  },
  saveDisabled: {
    opacity: 0.4,
  },
  saveLabel: {
    fontSize: 12,
    color: colors.onPrimary,
  },
});
