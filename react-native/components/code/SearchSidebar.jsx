import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useState} from 'react';

import {fileSystem} from '../fileSystem';
import {useRef} from 'react';

// `mode` is 'files' or 'code' when a shortcut opened the sidebar, and null
// when it was opened from the sidebar itself or closed with Escape.
export function SearchSidebar({onOpenFile, projectRoot, mode, onModeChange}) {
  const styles = useThemedStyles(createStyles);

  const inputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchingTerm, setSearchingTerm] = useState(mode ?? 'files');
  const [searchResults, setSearchResults] = useState([]);

  // A shortcut both picks the tab and puts the cursor in the input, so typing
  // can start straight away like VS Code's quick open.
  useEffect(() => {
    if (!mode) {
      return;
    }

    setSearchingTerm(mode);
    inputRef.current?.focus?.();
  }, [mode]);

  const selectMode = next => {
    setSearchingTerm(next);
    onModeChange?.(next);
  };

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
        <Pressable style={[styles.searchOption, searchingTerm === 'code' && styles.activeSearchOption]} onPress={() => selectMode('code')}>
          <Text style={[styles.searchOptionText, searchingTerm === 'code' && styles.activeSearchOptionText]}>Code</Text>
        </Pressable>

        <Pressable style={[styles.searchOption, searchingTerm === 'files' && styles.activeSearchOption]} onPress={() => selectMode('files')}>
          <Text style={[styles.searchOptionText, searchingTerm === 'files' && styles.activeSearchOptionText]}>Files</Text>
        </Pressable>
      </View>

      <TextInput ref={inputRef} style={styles.input} placeholder="Looking for something?" enableFocusRing={false} value={searchTerm} onChangeText={setSearchTerm} />

      {searchResults.map((result, index) => (
        <Pressable key={index} onPress={() => onOpenFile(result.path)} style={styles.resultContainer}>
          <Text style={styles.resultText} lineBreakMode="tail" numberOfLines={1}>{result?.name}</Text>
          <Text style={[styles.resultText, styles.resultTextSmall]}>{result.path}</Text>
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
  resultText: {
    borderRadius: 8,
    color: colors.onSurface,
  },
  resultTextSmall: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  resultContainer: {
    marginVertical: 8,
    ...glass(colors, {variant: 'subtle'}),
    padding: 8,
    borderRadius: 8,
    gap: 4,
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
