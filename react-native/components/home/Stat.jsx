import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

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
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.outline,
  },
  label: {
    fontSize: 24,
    opacity: 0.5,
    color: colors.outline,
  },
});
