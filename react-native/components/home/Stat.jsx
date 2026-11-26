import { StyleSheet, Text, View } from 'react-native';
import { surfaceStyle, useThemedStyles } from '../theme';

import React from 'react';
import { useCompactLayout } from '../useCompactLayout';
import { SnowCap } from '../seasonal/SnowCap';

export function Stat({value, label, attentionLevel = "low"}) {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);

  const attentionStyle = {
    low: styles.lowContainer,
    medium: styles.mediumContainer,
    high: styles.highContainer
  };

  return (
    <View style={[styles.content, compact && styles.compact, attentionStyle[attentionLevel]]}>
      <SnowCap maxHeight={10} />
      <Text style={[styles.value]}>{value}</Text>
      <Text style={[styles.label, compact && styles.compactLabel]}>{label}</Text>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  compact: { flexBasis: '45%', flexGrow: 1, padding: 12 },
  compactLabel: { fontSize: 16 },
  mediumContainer: {
    ...surfaceStyle(colors, {variant: 'tinted', tone: 'warningContainer'}),
    borderWidth: 2,
  },
  highContainer: {
    ...surfaceStyle(colors, {variant: 'tinted', tone: 'errorContainer'}),
    borderWidth: 2,
  },
  content: {
    ...surfaceStyle(colors),
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
