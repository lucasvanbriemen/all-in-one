import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {glass, useThemedStyles} from './theme';

import {CodeEditor} from './CodeEditor';
import {fileSystem} from './fileSystem';

export function CodePage({selection, onSelect}) {
  const styles = useThemedStyles(createStyles);
  const [source, setSource] = useState('// some comment\n');

  useEffect(() => {
    fileSystem.listFiles('').then(console.log).catch(console.error);
  }, []);

  return (
    <View style={styles.editor}>
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
