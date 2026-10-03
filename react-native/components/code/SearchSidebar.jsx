import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useState} from 'react';

import {fileSystem} from '../fileSystem';
import {useRef} from 'react';

export function SearchSidebar({currentFile, onOpenFile, onSave, projectRoot, setProjectRoot, openedFiles, setOpenedFiles}) {
  const styles = useThemedStyles(createStyles);

  const inputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchingTerm, setSearchingTerm] = useState('files');
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
      <View style={styles.searchOptions}>
        <View style={[styles.searchOption, searchingTerm === 'code' && styles.activeSearchOption]}>
          <Text style={[styles.searchOptionText, searchingTerm === 'code' && styles.activeSearchOptionText]}>Code</Text>
        </View>
        <View style={[styles.searchOption, searchingTerm === 'files' && styles.activeSearchOption]}>
          <Text style={[styles.searchOptionText, searchingTerm === 'files' && styles.activeSearchOptionText]}>Files</Text>
        </View>
      </View>

      <TextInput ref={inputRef} style={styles.input} placeholder="Looking for something?" enableFocusRing={false} value={searchTerm} onChangeText={setSearchTerm} />

      {searchResults.map((result, index) => (
        <Pressable key={index} onPress={() => onOpenFile(result.path)}>
          <Text style={styles.result}>{result.path}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const createStyles = colors => StyleSheet.create({
  editor: {
    ...glass(colors, {variant: 'subtle'}),
    marginBottom: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
  input: {
    padding: 8,
    borderRadius: 8,
    ...glass(colors, {variant: 'subtle'}),
  },
  searchOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    ...glass(colors, {variant: 'subtle'}),
    gap: 8,
    borderRadius: 100,
    padding: 8,
  },
  searchOption: {
    padding: 8,
    borderRadius: 100,
    flex: 1,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  result: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  activeSearchOption: {
    backgroundColor: colors.primary,
  },
  searchOptionText: {
    textAlign: 'center',
    color: colors.onSurface,
  },
  activeSearchOptionText: {
    color: colors.onPrimary,
  },
});
