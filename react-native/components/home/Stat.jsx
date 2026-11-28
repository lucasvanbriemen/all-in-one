import { StyleSheet, Text, View } from 'react-native';

import React from 'react';
import { useCompactLayout } from '../useCompactLayout';
import { SnowCap } from '../seasonal/SnowCap';

export function Stat({value, label, attentionLevel = "low"}) {
  const compact = useCompactLayout();
  const styles = createStyles();

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
    borderWidth: 2,
  },
  highContainer: {
    borderWidth: 2,
  },
  content: {
    borderWidth: 2,
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 24,
  },
});
