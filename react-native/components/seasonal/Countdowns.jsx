import {StyleSheet, Text, View} from 'react-native';

import React from 'react';
import {Stat} from '../home/Stat';
import {daysUntil} from './season';
import {useSeason} from './useSeason';
import {useThemedStyles} from '../theme';

/** A tile in Home's stat row: days to Christmas, then to the new year. */
export function CountdownStat() {
  const {decorated, phase, date} = useSeason();
  if (!decorated) return null;

  const year = date.getFullYear();

  if (phase === 'advent') {
    const days = daysUntil(new Date(year, 11, 25), date);
    return <Stat value={`${days} ${days === 1 ? 'day' : 'days'}`} label="until Christmas 🎄" />;
  }
  if (phase === 'christmas') {
    const day = date.getDate();
    return <Stat value={day === 24 ? 'Tonight!' : 'Merry Christmas!'} label={day === 26 ? 'Tweede Kerstdag 🎁' : 'Christmas 🎄'} />;
  }
  if (phase === 'between') {
    const days = daysUntil(new Date(year + 1, 0, 1), date);
    return <Stat value={`${days} ${days === 1 ? 'day' : 'days'}`} label={`until ${year + 1} 🎆`} />;
  }
  if (phase === 'nye') {
    return <Stat value="Tonight!" label={`${year + 1} is coming 🎆`} />;
  }
  return <Stat value={`Hello, ${year}`} label="Happy New Year 🎆" />;
}

/**
 * On New Year's Eve the greeting makes way for the clock. At midnight it
 * hands over to the fireworks (see SeasonalRoot).
 */
export function NewYearCountdown() {
  const styles = useThemedStyles(createStyles);
  const {date, phase} = useSeason(1000);
  if (phase !== 'nye') return null;

  const midnight = new Date(date.getFullYear() + 1, 0, 1);
  const left = Math.max(0, Math.floor((midnight - date) / 1000));
  const hours = Math.floor(left / 3600);
  const minutes = Math.floor((left % 3600) / 60);
  const seconds = left % 60;
  const pad = n => String(n).padStart(2, '0');
  const finalMinute = left <= 60;

  return (
    <View style={styles.container}>
      <Text style={[styles.clock, finalMinute && styles.final]}>
        {finalMinute ? left : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
      </Text>
      <Text style={styles.label}>until {date.getFullYear() + 1} 🎆</Text>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    container: {flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 16},
    clock: {fontSize: 40, fontWeight: 'bold', color: colors.primary, fontVariant: ['tabular-nums']},
    final: {fontSize: 56, color: colors.error ?? colors.primary},
    label: {fontSize: 24, color: colors.outline},
  });
