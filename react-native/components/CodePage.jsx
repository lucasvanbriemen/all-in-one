import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {glass, useThemedStyles} from './theme';

import {CodeEditor} from './CodeEditor';

export function CodePage({selection, onSelect}) {
  const styles = useThemedStyles(createStyles);
  const [source, setSource] = useState('// some comment\n');

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
