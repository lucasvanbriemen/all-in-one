import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {CodeEditor} from '../CodeEditor';
import {FileTree} from './FileTree';
import {fileSystem} from '../fileSystem';

export function CodePage({selection, onSelect}) {
  const styles = useThemedStyles(createStyles);
  const [files, setFiles] = useState([]);
  const [source, setSource] = useState('// some comment\n');
  const [currentFile, setCurrentFile] = useState(null);
  const [currentDirectory, setCurrentDirectory] = useState('');

  return (
    <View style={styles.editor}>
      <View style={styles.fileTree}>
        <FileTree source={source} setSource={setSource} currentFile={currentFile} setCurrentFile={setCurrentFile} />
      </View>
      
      <View style={styles.codeEditorContainer}>
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
  },
  fileTree: {
    flex: 1,
  },
});
