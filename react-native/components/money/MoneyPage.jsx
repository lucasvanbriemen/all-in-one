import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useEffect, useState} from 'react';

import {useAppContext} from '../../context/AppContext';
import {useThemedStyles} from '../theme';

export function MoneyPage() {
  const styles = useThemedStyles(createStyles);

  const {get} = useAppContext();

  return (
    <View style={styles.content}>
      <Text>Money Page</Text>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
