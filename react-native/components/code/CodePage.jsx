import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useState} from 'react';
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
        <View>
          <Pressable onPress={save}>
            <Text>Save</Text>
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
});
