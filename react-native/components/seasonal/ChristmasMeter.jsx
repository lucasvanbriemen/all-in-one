import {Pressable, StyleSheet, Text} from 'react-native';
import {boostMode, cycleBoost, effectiveShare} from './christmasMusic';
import {glass, useThemedStyles} from '../theme';

import React from 'react';
import {phaseOf} from './season';
import {useAppContext} from '../../context/AppContext';
import {usePersisted} from './store';
import {useSeason} from './useSeason';

const MODE_LABELS = {auto: '', more: ' · turned up', max: ' · all in', off: ' · off for today'};

/**
 * "Christmas level: 34%" under the Now Playing controls, from 1 November to
 * Boxing Day. Tap to turn it up, all the way, off, and back to automatic —
 * for today only. The day after Boxing Day it says goodbye.
 */
export function ChristmasMeter() {
  const styles = useThemedStyles(createStyles);
  const {date} = useSeason();
  const {get} = useAppContext();
  // Subscribing re-renders the meter when the boost changes.
  usePersisted('music.boost', null);

  const phase = phaseOf(date);
  const isDay27 = date.getMonth() === 11 && date.getDate() === 27;
  if (isDay27) {
    return <Text style={styles.over}>🎄 It's over. Go back to your life.</Text>;
  }
  if (phase !== 'pre' && phase !== 'advent' && phase !== 'christmas') return null;

  const mode = boostMode(date);
  const share = Math.round(effectiveShare(date, mode) * 100);
  const festiveNow = get('music.now-playing.christmas');

  return (
    <Pressable onPress={() => cycleBoost(date)} style={styles.meter} hitSlop={6}>
      <Text style={styles.label}>
        🎄 Christmas level {share}%{MODE_LABELS[mode]}
        {festiveNow ? '  ·  ♫ this one counts' : ''}
      </Text>
    </Pressable>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    meter: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 100,
      ...glass(colors, {variant: 'subtle'}),
    },
    label: {fontSize: 13, color: colors.onSurfaceVariant},
    over: {fontSize: 13, color: colors.outline},
  });
