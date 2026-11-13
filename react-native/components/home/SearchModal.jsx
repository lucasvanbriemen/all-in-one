import {useState, useEffect} from 'react';
import {StyleSheet, View, Text, TextInput, ScrollView} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useApi} from '../useApi';
import {openSource} from '../push';

import {useAppContext} from '../../context/AppContext';

export function SearchModal() {
  const styles = useThemedStyles(createStyles);
  const {get, set} = useAppContext();
  const open = get('app.showSearch') === true;
  const searchQuery = get('app.searchQuery') || '';
  const {data} = useApi(`/search?query=${encodeURIComponent(searchQuery)}`);

  const results = searchQuery.length > 0 && Array.isArray(data) ? data : [];

  const [focusedResultIndex, setFocusedResultIndex] = useState(0);

  useEffect(() => setFocusedResultIndex(0), [searchQuery]);

  const handleKeyDown = e => {
    const key = e.nativeEvent.key;
    if (key === 'ArrowDown') {
      setFocusedResultIndex(i => Math.max(0, Math.min(i + 1, results.length - 1)));
    } else if (key === 'ArrowUp') {
      setFocusedResultIndex(i => Math.max(i - 1, 0));
    } else if (key === 'Enter') {
      console.log('Opening source for result:', results[focusedResultIndex]);
      openSource(set, results[focusedResultIndex].source);
    }
  };

  if (!open) return null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.modal}>
        <TextInput style={styles.input} autoFocus={true} placeholder="Search..." value={searchQuery} onChangeText={text => set('app.searchQuery', text)} onKeyDown={handleKeyDown} keyDownEvents={[{key: 'ArrowUp'}, {key: 'ArrowDown'}, {key: 'Enter'}]} />

        <ScrollView> 
          {results.map((result, index) => (
            <View key={index} style={[styles.result, index % 2 === 0 ? styles.resultEven : styles.resultOdd, focusedResultIndex === index && styles.resultFocused]}>
              <Text style={[styles.resultTitle, focusedResultIndex === index && styles.resultFocused]}>{result.title}</Text>
              <Text style={[styles.resultSubtitle, focusedResultIndex === index && styles.resultFocused]}>{result.subtitle}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.surfaceAt3,
    boxShadow: '0 0 100px 160px rgba(0,0,0,0.5)',
    margin: 20,
    width: '50%',
    height: '50%',
    borderRadius: 16,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    color: colors.onSurface,
    borderRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16,
  },
  result: {
    padding: 16,
    borderRadius: 16,
    marginLeft: 16,
    marginRight: 16,
    marginTop: 16,
  },
  resultEven: {
    backgroundColor: colors.surfaceAt2,
  },
  resultFocused: {
    backgroundColor: colors.primaryContainer,
    color: colors.onPrimaryContainer,
  },
  resultTitle: {
    fontWeight: 'bold',
  },
  resultSubtitle: {
    color: colors.outline,
  }
});