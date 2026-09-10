import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useState} from 'react';

import {fileSystem} from '../fileSystem';
import {useRef} from 'react';

export function SearchSidebar({currentFile, onOpenFile, onSave, projectRoot, setProjectRoot, openedFiles, setOpenedFiles}) {
  const styles = useThemedStyles(createStyles);

  const inputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchingTerm, setSearchingTerm] = useState('code');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    async function search() {
      if (!searchTerm) {
        setSearchResults([]);
        return;
      }

      const response = await fileSystem.searchFiles(projectRoot, searchTerm, searchingTerm);
      setSearchResults(response.results ?? []);
    }

    search();
  }, [searchTerm, projectRoot, searchingTerm]);


  return (
    <ScrollView style={styles.editor}>
      <TextInput ref={inputRef} style={styles.input} placeholder="Looking for something?" enableFocusRing={false} value={searchTerm} onChangeText={setSearchTerm} />

      {searchResults.map((result, index) => (
        <Pressable key={index} onPress={() => onOpenFile(result)}>
          <Text style={styles.result}>{result.path}</Text>
        </Pressable>
      ))}
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
