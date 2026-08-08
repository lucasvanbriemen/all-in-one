import {StyleSheet, Text, View} from 'react-native';

import React from 'react';
import {useThemedStyles} from './theme';

export function EmailContent() {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.content}>
      <Text style={styles.title}>Hi</Text>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '400',
    color: colors.onSurface,
  },
});
