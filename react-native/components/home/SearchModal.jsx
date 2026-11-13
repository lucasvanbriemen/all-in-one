import {StyleSheet, View, Text, TextInput} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useApi} from '../useApi';

import {useAppContext} from '../../context/AppContext';

export function SearchModal() {
  const styles = useThemedStyles(createStyles);
  const {get, set} = useAppContext();
  const open = get('app.showSearch') === true;
  const searchQuery = get('app.searchQuery') || '';
  // useApi refetches by itself whenever the URL (and so the query) changes.
  const {data} = useApi(`/search?query=${encodeURIComponent(searchQuery)}`);

  // Anything other than a list (an error body, a stale cache entry) shows nothing.
  const results = searchQuery.length > 0 && Array.isArray(data) ? data : [];

  if (!open) return null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.modal}>
        <TextInput style={styles.input} autoFocus={true} placeholder="Search..." value={searchQuery} onChangeText={text => set('app.searchQuery', text)} />

          {results.map((result, index) => (
            <View key={index} style={{marginBottom: 10}}>
              <Text>{result.title}</Text>
              <Text>{result.subtitle}</Text>
            </View>
          ))}
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.surface,
    margin: 20,
    padding: 20,
    borderRadius: 10,
    width: '50%',
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  }
});