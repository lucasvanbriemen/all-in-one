import {StyleSheet, View, Text, TextInput, ScrollView} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useApi} from '../useApi';

import {useAppContext} from '../../context/AppContext';

export function SearchModal() {
  const styles = useThemedStyles(createStyles);
  const {get, set} = useAppContext();
  const open = get('app.showSearch') === true;
  const searchQuery = get('app.searchQuery') || '';
  const {data} = useApi(`/search?query=${encodeURIComponent(searchQuery)}`);

  const results = searchQuery.length > 0 && Array.isArray(data) ? data : [];

  if (!open) return null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.modal}>
        <TextInput style={styles.input} autoFocus={true} placeholder="Search..." value={searchQuery} onChangeText={text => set('app.searchQuery', text)} />

        <ScrollView> 
          {results.map((result, index) => (
            <View key={index} style={[styles.result, index % 2 === 0 ? styles.resultEven : styles.resultOdd]}>
              <Text style={styles.resultTitle}>{result.title}</Text>
              <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
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
    padding: 20,
    borderRadius: 10,
    width: '50%',
    maxHeight: '80%'
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  result: {
    padding: 16,
    borderRadius: 16,
  },
  resultEven: {
    backgroundColor: colors.surfaceAt2,
  },
  resultTitle: {
    fontWeight: 'bold',
  },
  resultSubtitle: {
    color: colors.outline,
  }
});