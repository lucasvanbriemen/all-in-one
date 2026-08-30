import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useState} from 'react';

import {useRef} from 'react';

export function SearchSidebar({currentFile, onOpenFile, onSave, projectRoot, setProjectRoot, openedFiles, setOpenedFiles}) {
  const styles = useThemedStyles(createStyles);

  const inputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <ScrollView style={styles.editor}>
      <TextInput ref={inputRef} style={styles.input} placeholder="Looking for something?" enableFocusRing={false} value={searchTerm} onChangeText={setSearchTerm} />
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
  input: {
    padding: 8,
    borderRadius: 8,
    ...glass(colors, {tint: 0.25}),
  },
});
