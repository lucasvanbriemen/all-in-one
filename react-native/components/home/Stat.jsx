import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

export function Stat({value, label, attentionLevel = "low"}) {
  const styles = useThemedStyles(createStyles);

  const attentionStyle = {
    low: styles.lowContainer,
    medium: styles.mediumContainer,
    high: styles.highContainer
  };

  return (
    <View style={[styles.content, attentionStyle[attentionLevel]]}>
      <Text style={[styles.value]}>{value}</Text>
      <Text style={[styles.label]}>{label}</Text>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  mediumContainer: {
    borderColor: colors.warningContainer,
    borderTopColor: colors.warningContainer,
    ...glass(colors, {tone: 'warningContainer'}),
    borderWidth: 2,
  },
  highContainer: {
    borderColor: colors.errorContainer,
    borderTopColor: colors.errorContainer,
    ...glass(colors, {tone: 'errorContainer'}),
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
