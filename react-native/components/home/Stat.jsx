import { StyleSheet, Text, View } from 'react-native';
import { glass, useThemedStyles } from '../theme';

import React from 'react';
import { useCompactLayout } from '../useCompactLayout';

export function Stat({ value, label, attentionLevel = 'low' }) {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);

  const attentionStyle = {
    low: styles.lowContainer,
    medium: styles.mediumContainer,
    high: styles.highContainer
  };

  return (
    <View style={[styles.content, compact && styles.compact, attentionStyle[attentionLevel]]}>
      <Text style={[styles.value]}>{value}</Text>
      <Text style={[styles.label, compact && styles.compactLabel]}>{label}</Text>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  compact: { flexBasis: '45%', flexGrow: 1, padding: 12 },
  compactLabel: { fontSize: 16 },
  mediumContainer: {
    ...glass(colors, { variant: 'tinted', tone: 'warningContainer' }),
    borderWidth: 2,
  },
  highContainer: {
    ...glass(colors, { variant: 'tinted', tone: 'errorContainer' }),
    borderWidth: 2,
  },
  content: {
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.onSurfaceVariant,
  },
  label: {
    fontSize: 24,
    color: colors.outline,
  },
});
