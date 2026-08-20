import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from './theme';

import {CodeEditor} from './CodeEditor';
import {fileSystem} from './fileSystem';

export function CodePage({selection, onSelect}) {
  const styles = useThemedStyles(createStyles);
  const [files, setFiles] = useState([]);
  const [source, setSource] = useState('// some comment\n');
  const [currentFile, setCurrentFile] = useState(null);

  useEffect(() => {
    fileSystem.listFiles('')
      .then(response => setFiles(response.contents ?? []))
      .catch(console.error);
  }, []);

  function handleFileSelect(file) {
    fileSystem.readFile(file.name)
      .then(response => setSource(response.contents ?? ''))
      .then(() => setCurrentFile(file.name))
      .then(() => console.log('contents', source))
      .catch(console.error);
  }

  return (
    <View style={styles.editor}>
      <Text>test</Text>
      <Text onPress={() => fileSystem.writeFile(currentFile, source)}>save</Text>
      {files.map(file => (
        <Text key={file.name} onPress={() => handleFileSelect(file)}>{file.name}</Text>
      ))}
      <CodeEditor value={source} language="javascript" onChange={setSource} />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  editor: {
    ...glass(colors),
    flex: 1,
    borderRadius: 16,
  },
});
