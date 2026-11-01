import {StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import React from 'react';
import {useSeason} from './useSeason';

const DAYS = {
  '11-24': '🎅 Coding on Christmas Eve? Workaholic.',
  '11-25': '🎅 Coding on Christmas Day. Workaholic badge unlocked.',
  '11-26': '🎅 Tweede Kerstdag and you’re in a terminal. Workaholic.',
  '11-31': '🎆 Shipping on New Year’s Eve? Bold.',
  '0-1': '🎆 Coding on New Year’s Day. Resolution: rest more?',
};

/** Shows up on the Code page on the days you really shouldn't be on it. */
export function WorkaholicBadge() {
  const styles = useThemedStyles(createStyles);
  const {date, decorated} = useSeason();
  const text = decorated && DAYS[`${date.getMonth()}-${date.getDate()}`];
  if (!text) return null;

  return (
    <View style={styles.badge} pointerEvents="none">
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    badge: {
      position: 'absolute',
      top: 12,
      right: 12,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 100,
      zIndex: 10,
      ...glass(colors, {variant: 'tinted', tone: 'errorContainer'}),
    },
    text: {fontSize: 13, fontWeight: '600', color: colors.onSurface},
  });
