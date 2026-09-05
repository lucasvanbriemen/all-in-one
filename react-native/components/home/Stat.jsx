import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useThemedStyles} from '../theme';

export function Stat({value, label}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.content}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flex: 1,
    flexDirection: 'row',
    gap: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    opacity: 0.5,
    color: colors.onSurfaceVariant,
  },
  label: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    opacity: 0.5,
    color: colors.onSurfaceVariant,
  },
});
