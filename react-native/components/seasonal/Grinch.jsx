import {Animated, Easing, Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useMemo} from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';
import {glass, useThemedStyles} from '../theme';
import {grinchKey, ornamentSpots, useSeason} from './useSeason';
import {getPersisted, playEffect, setPersisted, showToast} from './store';
import {useBottomInset} from '../useCompactLayout';

/**
 * One day in December the Grinch steals Christmas: every decoration is gone,
 * and the ornaments are hidden around the app — one in each page. Find them
 * all and it comes back, with fireworks.
 */
export function GrinchNote() {
  const styles = useThemedStyles(createStyles);
  const {grinchActive, year} = useSeason();
  const bottomInset = useBottomInset();
  if (!grinchActive) return null;

  const found = getPersisted(grinchKey(year), []);
  const spots = ornamentSpots();

  return (
    <View style={[styles.note, {bottom: 24 + bottomInset}]} pointerEvents="none">
      <Text style={styles.title}>🟢 The Grinch stole Christmas.</Text>
      <Text style={styles.body}>
        He hid the ornaments around the app — one on every page. Find them all to get Christmas back.
      </Text>
      <Text style={styles.count}>
        {found.length} / {spots.length} found
      </Text>
    </View>
  );
}

const SPOT_NAMES = {email: 'mail', music: 'music', money: 'money', messages: 'messages', code: 'code'};

/** Drop one into a page; it only shows up on the Grinch's day, until it's found. */
export function HiddenOrnament({spot, style}) {
  const {grinchActive, year} = useSeason();
  const sway = useMemo(() => new Animated.Value(0), []);
  const found = getPersisted(grinchKey(year), []);
  const visible = grinchActive && !found.includes(spot);

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(sway, {toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, sway]);

  if (!visible) return null;

  function collect() {
    const next = [...new Set([...getPersisted(grinchKey(year), []), spot])];
    setPersisted(grinchKey(year), next);
    const total = ornamentSpots().length;
    const all = ornamentSpots().every(s => next.includes(s));

    if (all) {
      playEffect({type: 'fireworks', seconds: 8});
      showToast({emoji: '🎄', title: 'You saved Christmas!', body: 'Every ornament is back on the tree. The Grinch is sulking somewhere.'});
    } else {
      showToast({emoji: '✨', title: `Found the ${SPOT_NAMES[spot] ?? spot} ornament`, body: `${next.length} of ${total}. Keep looking.`});
    }
  }

  return (
    <Animated.View
      style={[
        {transform: [{rotate: sway.interpolate({inputRange: [0, 1], outputRange: ['-12deg', '12deg']})}]},
        style,
      ]}>
      <Pressable onPress={collect} hitSlop={10}>
        <Ornament size={18} color="#e63946" />
      </Pressable>
    </Animated.View>
  );
}

export function Ornament({size = 18, color = '#e63946', shine = true}) {
  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 20 24">
      <Rect x="7.5" y="0.5" width="5" height="4" rx="1" fill="#d4a017" />
      <Circle cx="10" cy="14" r="9" fill={color} />
      {shine && <Path d="M5 11 a6 6 0 0 1 4 -4" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" fill="none" />}
    </Svg>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    note: {
      position: 'absolute',
      right: 24,
      bottom: 24,
      maxWidth: 300,
      padding: 16,
      borderRadius: 16,
      gap: 6,
      ...glass(colors, {variant: 'tinted', tone: 'errorContainer'}),
      zIndex: 30,
    },
    title: {fontSize: 16, fontWeight: 'bold', color: colors.onSurface},
    body: {fontSize: 14, color: colors.onSurfaceVariant},
    count: {fontSize: 14, fontWeight: '600', color: colors.primary},
  });
