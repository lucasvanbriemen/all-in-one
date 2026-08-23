import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useCallback, useEffect, useRef, useState} from 'react';

import {FileIcon} from '../icons/FileIcon';
import {fileSystem} from '../fileSystem';

// Claimed so macOS stops handling these itself; the events reach JS either way.
const KEY_DOWN_EVENTS = [{key: 'Escape'}, {key: 'p', metaKey: true}];

export function SearchModal({projectRoot, folder, onOpenFile, onClose, itemsDeep}) {
  const styles = useThemedStyles(createStyles);
  const input = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Opened from the editor, focus is still inside Monaco's WebView, which eats
  // every key it is given — Escape included. Taking focus here is what makes
  // the modal closable, and later what will let the search field be typed in.
  useEffect(() => {
    input.current?.focus?.();
  }, []);

  useEffect(() => {
    async function search() {
      if (!searchTerm) {
        setSearchResults([]);
        return;
      }

      console.log('search', searchTerm, projectRoot);
      const response = await fileSystem.searchFiles(projectRoot, searchTerm);
      setSearchResults(response.results ?? []);
    }

    search();
  }, [searchTerm, projectRoot, folder]);

  const onKeyDown = useCallback(
    event => {
      if ((event.nativeEvent ?? event).key === 'Escape') {
        onClose?.();
      }
    },
    [onClose],
  );

  function fileDisplayName(filePath) {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  }

  return (
    <View focusable enableFocusRing={false} style={styles.overlay} onKeyDown={onKeyDown} keyDownEvents={KEY_DOWN_EVENTS}>
      <Pressable style={styles.overlay} onPress={onClose} />

      <View style={styles.panel}>
        <TextInput ref={input} style={styles.input} placeholder="Looking for something?" enableFocusRing={false} value={searchTerm} onChangeText={setSearchTerm} />

        <ScrollView style={{maxHeight: 300, minHeight: 300, marginTop: 16}} >
          {searchResults.map(searchResult => (
            <Pressable key={searchResult} onPress={() => onOpenFile(searchResult)} style={{flexDirection: 'row', gap: 8, alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', marginBottom: 4}}>
              <FileIcon name={searchResult} isDirectory={false} />
              <Text>{fileDisplayName(searchResult)}</Text>
              <Text>{searchResult}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  // Filled absolutely rather than by `flex`, so the row it sits in gives it no
  // track of its own and it covers the tree and the editor both.
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  panel: {
    minWidth: 750,
    maxWidth: 750,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.primaryContainer,
    ...glass(colors, {tint: 0.5, tone: "surfaceAt4"}),
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 50},
    shadowOpacity: 0.5,
    shadowRadius: 100,
    position: 'absolute',
    top: 64,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.surface,
  },
  
});
