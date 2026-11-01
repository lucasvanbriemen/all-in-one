import {Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useMemo, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {hideYearInReview, playEffect, setPersisted, showYearInReview, usePersisted, useSeasonalState} from './store';

import {SnowCap} from './SnowCap';
import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from '../useCompactLayout';
import {useSeason} from './useSeason';
import {useSeasonalData} from './data';

/**
 * Twenty-four doors, one unlocking each morning, each hiding a number from
 * your own year — your music, mail, messages and money. Door 24 is the whole
 * year on one screen.
 *
 * Which doors you've opened is kept on the server, so a door opened on the
 * phone is open on the Mac too.
 */
export function AdventCalendar() {
  const styles = useThemedStyles(createStyles);
  const compact = useCompactLayout();
  const {phase, year} = useSeason();
  const {get, set} = useAppContext();
  const [advent] = useSeasonalData('/seasonal/advent');
  const opened = usePersisted(`advent.${year}.opened`, []);
  const [selected, setSelected] = useState(null);

  const doors = useMemo(() => Object.fromEntries((advent?.doors ?? []).map(door => [door.day, door])), [advent]);
  const unlocked = advent?.unlocked ?? 0;
  // After Christmas there is nothing left to wait for: everything is open.
  const allOpen = phase !== 'advent' && phase !== 'christmas';

  // The morning push ("Door 7 is open") lands here.
  const requested = get('seasonal.openDoor');
  useEffect(() => {
    if (requested && doors[requested]) {
      open(requested);
      set('seasonal.openDoor', null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested, doors]);

  function open(day) {
    if (day > unlocked || !doors[day]) return;
    if (!opened.includes(day)) {
      setPersisted(`advent.${year}.opened`, [...opened, day]);
    }
    setSelected(day);
    if (day === 24) showYearInReview(doors[24]);
  }

  const door = selected ? doors[selected] : null;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <SnowCap />
      <View style={styles.header}>
        <Text style={styles.title}>Advent calendar</Text>
        <Text style={styles.subtitle}>{unlocked >= 24 ? 'All doors open' : `${unlocked} of 24 unlocked`}</Text>
      </View>

      <View style={[styles.body, compact && styles.bodyCompact]}>
        <View style={styles.grid}>
          {Array.from({length: 24}, (_, i) => i + 1).map(day => (
            <Door
              key={day}
              day={day}
              door={doors[day]}
              locked={day > unlocked}
              isOpen={allOpen || opened.includes(day)}
              selected={selected === day}
              onPress={() => open(day)}
              styles={styles}
            />
          ))}
        </View>

        <View style={styles.reveal}>
          {door ? (
            <ScrollView>
              <Text style={styles.revealEmoji}>{door.emoji}</Text>
              <Text style={styles.revealTitle}>{door.title}</Text>
              <Text style={styles.revealBody}>{door.body}</Text>
            </ScrollView>
          ) : (
            <Text style={styles.hint}>
              {unlocked === 0 ? 'The first door opens on 1 December.' : 'Pick a door. The glowing one is today’s.'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function Door({day, door, locked, isOpen, selected, onPress, styles}) {
  const swing = useMemo(() => new Animated.Value(isOpen ? 1 : 0), []); // eslint-disable-line react-hooks/exhaustive-deps
  const glow = useMemo(() => new Animated.Value(0), []);
  const fresh = !locked && !isOpen;

  useEffect(() => {
    Animated.timing(swing, {toValue: isOpen ? 1 : 0, duration: 650, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true}).start();
  }, [isOpen, swing]);

  // Today's unopened door breathes so it is easy to find.
  useEffect(() => {
    if (!fresh) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {toValue: 1, duration: 900, useNativeDriver: true}),
        Animated.timing(glow, {toValue: 0, duration: 900, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fresh, glow]);

  return (
    <Pressable onPress={onPress} disabled={locked} style={[styles.door, selected && styles.doorSelected, day === 24 && styles.doorBig]}>
      {/* Behind the door */}
      <View style={styles.behind}>
        <Text style={styles.behindEmoji}>{door?.emoji ?? '🎁'}</Text>
      </View>
      {/* The door itself, hinged on its left edge */}
      <Animated.View
        style={[
          styles.leaf,
          locked && styles.leafLocked,
          {
            opacity: swing.interpolate({inputRange: [0, 0.85, 1], outputRange: [1, 1, 0]}),
            transform: [
              {perspective: 300},
              {translateX: -20},
              {rotateY: swing.interpolate({inputRange: [0, 1], outputRange: ['0deg', '-105deg']})},
              {translateX: 20},
              {scale: glow.interpolate({inputRange: [0, 1], outputRange: [1, 1.06]})},
            ],
          },
        ]}>
        <Text style={[styles.doorNumber, locked && styles.doorNumberLocked]}>{day}</Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Door 24, full-window: the year's headline numbers, with fireworks.
 * Rendered by the seasonal overlay so it sits over everything.
 */
export function YearInReview() {
  const styles = useThemedStyles(createStyles);
  const door = useSeasonalState(s => s.yearInReview);
  const appear = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!door) return;
    appear.setValue(0);
    Animated.timing(appear, {toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true}).start();
    playEffect({type: 'fireworks', seconds: 5});
  }, [door, appear]);

  if (!door) return null;

  return (
    <Animated.View style={[styles.reviewBackdrop, {opacity: appear}]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={hideYearInReview} />
      <Animated.View style={[styles.review, {transform: [{scale: appear.interpolate({inputRange: [0, 1], outputRange: [0.92, 1]})}]}]}>
        <Text style={styles.reviewEmoji}>{door.emoji}</Text>
        <Text style={styles.reviewTitle}>{door.title}</Text>
        <Text style={styles.reviewBody}>{door.body}</Text>
        <View style={styles.reviewGrid}>
          {(door.summary ?? []).map(item => (
            <View key={item.label} style={styles.reviewItem}>
              <Text style={styles.reviewValue}>{item.value}</Text>
              <Text style={styles.reviewLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={hideYearInReview} style={styles.reviewClose}>
          <Text style={styles.reviewCloseText}>Merry Christmas 🎄</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    card: {
      ...glass(colors),
      borderRadius: 16,
      padding: 12,
      flex: 2,
      gap: 8,
    },
    cardCompact: {flex: 0},
    header: {flexDirection: 'row', alignItems: 'baseline', gap: 8},
    title: {fontSize: 18, fontWeight: 'bold', color: colors.onSurface},
    subtitle: {fontSize: 14, color: colors.outline},
    body: {flexDirection: 'row', gap: 12, flex: 1},
    bodyCompact: {flexDirection: 'column'},
    grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, maxWidth: 12 * 40 + 11 * 6, alignContent: 'flex-start'},
    door: {width: 40, height: 40, borderRadius: 8, overflow: 'visible'},
    doorBig: {width: 40},
    doorSelected: {borderWidth: 2, borderColor: colors.primary},
    behind: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      ...glass(colors, {variant: 'subtle'}),
    },
    behindEmoji: {fontSize: 20},
    leaf: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#b3202f',
      borderWidth: 1,
      borderColor: '#ffd23f',
    },
    leafLocked: {backgroundColor: '#5a1f26', borderColor: 'rgba(255, 210, 63, 0.35)'},
    doorNumber: {fontSize: 15, fontWeight: 'bold', color: '#fff4d6'},
    doorNumberLocked: {color: 'rgba(255, 244, 214, 0.45)'},
    reveal: {flex: 1, minHeight: 60, justifyContent: 'center'},
    revealEmoji: {fontSize: 30},
    revealTitle: {fontSize: 16, fontWeight: 'bold', color: colors.onSurface, marginTop: 4},
    revealBody: {fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4},
    hint: {fontSize: 14, color: colors.outline},

    reviewBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(5, 10, 20, 0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      zIndex: 50,
    },
    review: {
      maxWidth: 720,
      width: '100%',
      padding: 28,
      borderRadius: 24,
      gap: 10,
      alignItems: 'center',
      ...glass(colors, {variant: 'surface'}),
      backgroundColor: colors.surface ?? '#111318',
    },
    reviewEmoji: {fontSize: 52},
    reviewTitle: {fontSize: 30, fontWeight: 'bold', color: colors.onSurface, textAlign: 'center'},
    reviewBody: {fontSize: 16, color: colors.onSurfaceVariant, textAlign: 'center'},
    reviewGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 12},
    reviewItem: {
      minWidth: 150,
      padding: 14,
      borderRadius: 16,
      alignItems: 'center',
      ...glass(colors, {variant: 'subtle'}),
    },
    reviewValue: {fontSize: 26, fontWeight: 'bold', color: colors.primary},
    reviewLabel: {fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center'},
    reviewClose: {marginTop: 16, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 100, ...glass(colors, {variant: 'accent'})},
    reviewCloseText: {color: colors.onPrimary, fontWeight: '600'},
  });
