import {StyleSheet, View, Text} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect} from 'react';

import {useAppContext} from '../../context/AppContext';

export function SearchModal() {
  const styles = useThemedStyles(createStyles);
  const {get, set} = useAppContext();
  const open = get('app.showSearch') === true;

  if (!open) return null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.modal}>
        <Text>Hello</Text>
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
});