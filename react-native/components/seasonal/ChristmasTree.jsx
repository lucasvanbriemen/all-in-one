import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Defs, G, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import {glass, useThemedStyles} from '../theme';

import {SnowCap} from './SnowCap';
import {useSeasonalData} from './data';

/**
 * The tree you decorate by getting things done in December: an ornament for
 * every reminder completed, a light for every transaction categorised, and the
 * star once the inbox is at zero. Slack off and it stays bare.
 */
const ORNAMENT_COLORS = ['#e63946', '#ffd23f', '#4fb6ff', '#c77dff', '#ff9f1c', '#f1faee'];
const LIGHT_COLORS = ['#fff3b0', '#ffd23f', '#ff6b6b', '#8ce99a'];
const MAX_ORNAMENTS = 36;
const MAX_LIGHTS = 48;

/** Spots on the tree, the same every time: seeded, so ornaments don't move between renders. */
function slots(count, seed) {
  let s = seed;
  const random = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  return Array.from({length: count}, () => {
    const y = 58 + random() * 140;
    // Half-width of the tree at that height, a bit inside the edge.
    const half = ((y - 30) / 175) * 78 - 8;
    return {x: 100 + (random() * 2 - 1) * Math.max(4, half), y};
  });
}

export function TreeDrawing({ornaments = 0, lights = 0, star = false, size = 160, twinkle = true}) {
  const [phase, setPhase] = useState(0);
  const ornamentSlots = useMemo(() => slots(MAX_ORNAMENTS, 11), []);
  const lightSlots = useMemo(() => slots(MAX_LIGHTS, 97), []);

  useEffect(() => {
    if (!twinkle || lights === 0) return;
    const timer = setInterval(() => setPhase(p => (p + 1) % 4), 900);
    return () => clearInterval(timer);
  }, [twinkle, lights]);

  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 200 240">
      <Defs>
        <LinearGradient id="treeGreen" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2f9e5b" />
          <Stop offset="1" stopColor="#14532d" />
        </LinearGradient>
      </Defs>
      <Rect x="88" y="200" width="24" height="30" rx="3" fill="#7a4a24" />
      <Path d="M100 30 L150 100 L50 100 Z" fill="url(#treeGreen)" />
      <Path d="M100 62 L165 150 L35 150 Z" fill="url(#treeGreen)" />
      <Path d="M100 100 L180 205 L20 205 Z" fill="url(#treeGreen)" />

      <G>
        {lightSlots.slice(0, Math.min(lights, MAX_LIGHTS)).map((slot, i) => (
          <Circle
            key={`l${i}`}
            cx={slot.x}
            cy={slot.y}
            r={2.6}
            fill={LIGHT_COLORS[i % LIGHT_COLORS.length]}
            opacity={(i + phase) % 4 === 0 ? 0.35 : 1}
          />
        ))}
        {ornamentSlots.slice(0, Math.min(ornaments, MAX_ORNAMENTS)).map((slot, i) => (
          <G key={`o${i}`}>
            <Circle cx={slot.x} cy={slot.y} r={5.5} fill={ORNAMENT_COLORS[i % ORNAMENT_COLORS.length]} />
            <Circle cx={slot.x - 1.8} cy={slot.y - 1.8} r={1.4} fill="white" opacity={0.6} />
          </G>
        ))}
      </G>

      <Path
        d="M100 6 L106 22 L123 22 L109 32 L114 48 L100 38 L86 48 L91 32 L77 22 L94 22 Z"
        fill={star ? '#ffd23f' : 'none'}
        stroke={star ? '#f4a300' : '#8a8f98'}
        strokeWidth={star ? 1.5 : 2}
        strokeDasharray={star ? undefined : '4 3'}
      />
    </Svg>
  );
}

export function ChristmasTreeCard() {
  const styles = useThemedStyles(createStyles);
  const [tree] = useSeasonalData('/seasonal/tree');
  const ornaments = tree?.ornaments ?? 0;
  const lights = tree?.lights ?? 0;
  const star = Boolean(tree?.star);
  const bare = tree && ornaments === 0 && lights === 0 && !star;

  return (
    <View style={styles.card}>
      <SnowCap />
      <TreeDrawing ornaments={ornaments} lights={lights} star={star} size={110} />
      <View style={styles.legend}>
        <Text style={styles.title}>Your tree</Text>
        {bare ? (
          <Text style={styles.line}>Bare. Go get something done.</Text>
        ) : (
          <>
            <Text style={styles.line}>🔴 {ornaments} reminders done</Text>
            <Text style={styles.line}>💡 {lights} transactions sorted</Text>
            <Text style={styles.line}>{star ? '⭐ Inbox zero!' : '☆ Inbox zero gets the star'}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    card: {
      ...glass(colors),
      borderRadius: 16,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    legend: {flex: 1, gap: 4},
    title: {fontSize: 18, fontWeight: 'bold', color: colors.onSurface, marginBottom: 4},
    line: {fontSize: 14, color: colors.onSurfaceVariant},
  });
