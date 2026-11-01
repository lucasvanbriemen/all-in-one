import {Animated, Easing, StyleSheet, View} from 'react-native';
import React, {useEffect, useMemo, useState} from 'react';
import Svg, {Path} from 'react-native-svg';

import {useAppContext} from '../../context/AppContext';
import {useSeason} from './useSeason';

/**
 * A string of fairy lights along the top of the content panel.
 *
 * While music plays the bulbs pulse on the beat — the song's own BPM when the
 * music DB knows it — alternating like a chaser. Paused, they twinkle slowly
 * and out of step. After ten at night they burn warm instead of coloured.
 *
 * Both animations run on the native driver off two shared values, however
 * many bulbs there are.
 */
const SPACING = 36;
const SAG = 7;
const COLORS = ['#ff4040', '#36d17a', '#ffd23f', '#4fb6ff'];
const COZY_COLORS = ['#ffb054', '#ff8c42', '#ffd98a'];

export function StringLights({style}) {
  const {decorated, cozy} = useSeason();
  const {get} = useAppContext();
  const [length, setLength] = useState(0);

  const playing = Boolean(get('music.now-playing.is-playing'));
  const bpm = Number(get('music.now-playing.bpm')) || 112;

  const pulse = useMemo(() => new Animated.Value(0), []);
  const twinkle = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!decorated) return;
    const beat = Math.max(250, Math.min(1000, 60_000 / bpm));
    const animation = playing
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, {toValue: 1, duration: beat / 2, easing: Easing.out(Easing.quad), useNativeDriver: true}),
            Animated.timing(pulse, {toValue: 0, duration: beat / 2, easing: Easing.in(Easing.quad), useNativeDriver: true}),
          ]),
        )
      : Animated.loop(Animated.timing(twinkle, {toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true}));
    animation.start();
    return () => animation.stop();
  }, [decorated, playing, bpm, pulse, twinkle]);

  const count = Math.max(0, Math.floor(length / SPACING));
  // A fixed phase per bulb so the twinkle doesn't re-shuffle on every render.
  const phases = useMemo(() => Array.from({length: 120}, (_, i) => 0.05 + ((i * 0.618) % 1) * 0.75), []);

  if (!decorated) return null;

  const palette = cozy ? COZY_COLORS : COLORS;
  const offset = (length - (count - 1) * SPACING) / 2;
  const points = Array.from({length: count}, (_, i) => offset + i * SPACING);

  return (
    <View
      pointerEvents="none"
      style={[styles.string, style]}
      onLayout={event => setLength(event.nativeEvent.layout.width)}>
      {count > 1 && (
        <Svg style={StyleSheet.absoluteFill} width={length} height={24}>
          <Path d={wirePath(points)} stroke="#1d3b2a" strokeWidth={1.4} fill="none" opacity={0.8} />
        </Svg>
      )}

      {points.map((at, index) => {
        const opacity = playing
          ? pulse.interpolate({inputRange: [0, 1], outputRange: index % 2 ? [0.3, 1] : [1, 0.3]})
          : twinkle.interpolate({
              inputRange: [0, phases[index], phases[index] + 0.07, phases[index] + 0.15, 1],
              outputRange: [1, 1, 0.25, 1, 1],
            });
        const color = palette[index % palette.length];
        return (
          <View key={index} style={[styles.bulbWrap, {left: at - 4, top: SAG + 3}]}>
            <View style={styles.socket} />
            <Animated.View style={[styles.bulb, {backgroundColor: color, shadowColor: color, opacity}]} />
          </View>
        );
      })}
    </View>
  );
}

/** The wire dips between bulbs, so each bulb hangs from a low point. */
function wirePath(points) {
  if (points.length < 2) return '';
  const base = 3;
  const coordinate = (along, across) => `${along} ${across}`;
  let d = `M ${coordinate(points[0] - 18, base)} Q ${coordinate(points[0] - 9, base + SAG / 2)} ${coordinate(points[0], base + SAG)}`;
  for (let i = 1; i < points.length; i++) {
    const mid = (points[i - 1] + points[i]) / 2;
    d += ` Q ${coordinate(mid, base - 2)} ${coordinate(points[i], base + SAG)}`;
  }
  const last = points[points.length - 1];
  return d + ` Q ${coordinate(last + 9, base + SAG / 2)} ${coordinate(last + 18, base)}`;
}

const styles = StyleSheet.create({
  string: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -4,
    height: 26,
    zIndex: 6,
  },
  bulbWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  socket: {
    width: 4,
    height: 3,
    borderRadius: 1,
    backgroundColor: '#1d3b2a',
  },
  bulb: {
    width: 8,
    height: 11,
    borderRadius: 5,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 0},
  },
});
