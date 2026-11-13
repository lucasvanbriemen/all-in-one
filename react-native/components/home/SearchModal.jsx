import {StyleSheet, View, Text, TextInput} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect} from 'react';
import {useApi} from '../useApi';

import {useAppContext} from '../../context/AppContext';

export function SearchModal() {
  const styles = useThemedStyles(createStyles);
  const {get, set} = useAppContext();
  const open = get('app.showSearch') === true;
  const searchQuery = get('app.searchQuery') || '';
  const {data, refresh} = useApi(`/search?query=${searchQuery}`);

  const results = data || [];

  useEffect(() => {
    if (searchQuery.length > 0) {
      refresh();
    }
  }, [get('app.searchQuery')]);

  useEffect(() => {
    console.log(results);
  }, [results]);

  if (!open) return null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.modal}>
        <TextInput style={styles.input} autoFocus={true} placeholder="Search..." value={searchQuery} onChangeText={text => set('app.searchQuery', text)} />
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