import {Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useMemo} from 'react';
import Svg, {Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {glass, useThemedStyles} from '../theme';

import {Snowfall} from './Snowfall';
import {TreeDrawing} from './ChristmasTree';
import {useAppContext} from '../../context/AppContext';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';
import {useSeasonalData} from './data';

/**
 * Christmas Eve to Boxing Day, Home is a living room: a fire going, snow
 * outside the window, your tree in the corner. The normal Home is one tap
 * away, and remembered for the rest of the session.
 */
export function FireplaceScene({greeting}) {
  const styles = useThemedStyles(createStyles);
  const compact = useCompactLayout();
  const bottomInset = useBottomInset();
  const {set, get} = useAppContext();
  const [tree] = useSeasonalData('/seasonal/tree');
  const nowPlaying = get('music.now-playing');

  return (
    <ScrollView contentContainerStyle={[styles.page, {paddingBottom: bottomInset + 16}]}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Pressable onPress={() => set('seasonal.normalHome', true)} style={styles.normal}>
          <Text style={styles.normalText}>Normal home →</Text>
        </Pressable>
      </View>

      <View style={[styles.room, compact && styles.roomCompact]}>
        <View style={styles.windowFrame}>
          <View style={styles.window}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <LinearGradient id="night" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#0b1530" />
                  <Stop offset="1" stopColor="#24406e" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#night)" />
              <Ellipse cx="50%" cy="100%" rx="70%" ry="18%" fill="#e8f0fa" />
            </Svg>
            <Snowfall intensity="light" />
            {/* Window bars */}
            <View style={styles.barVertical} />
            <View style={styles.barHorizontal} />
          </View>
          <View style={styles.sill} />
        </View>

        <Hearth styles={styles} />

        <View style={styles.treeCorner}>
          <TreeDrawing ornaments={tree?.ornaments ?? 0} lights={tree?.lights ?? 0} star={Boolean(tree?.star)} size={230} />
          <Text style={styles.presents}>🎁 🎁 🎁</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🎶 {nowPlaying?.title ? `${nowPlaying.title} — ${nowPlaying.artist}` : 'Nothing playing. Put something on — shuffle is all Christmas today.'}
        </Text>
      </View>
    </ScrollView>
  );
}

/** The fireplace: a brick surround, a mantel with stockings, and a fire that won't sit still. */
function Hearth({styles}) {
  return (
    <View style={styles.hearth}>
      <View style={styles.mantel}>
        <Text style={styles.stockings}>🧦   🧦   🧦</Text>
      </View>
      <View style={styles.surround}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 260 200" preserveAspectRatio="none">
          <Rect x="0" y="0" width="260" height="200" fill="#7b3328" />
          <G stroke="#5e241c" strokeWidth="2">
            {Array.from({length: 10}, (_, row) => (
              <Path key={row} d={`M0 ${row * 20} H260`} />
            ))}
            {Array.from({length: 10}, (_, row) =>
              Array.from({length: 7}, (_, col) => <Path key={`${row}-${col}`} d={`M${col * 40 + (row % 2 ? 20 : 0)} ${row * 20} V${row * 20 + 20}`} />),
            )}
          </G>
        </Svg>
        <View style={styles.firebox}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <RadialGradient id="ember" cx="50%" cy="100%" r="80%">
                <Stop offset="0" stopColor="#ff9f1c" stopOpacity="0.8" />
                <Stop offset="1" stopColor="#120806" stopOpacity="1" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#ember)" />
          </Svg>
          <View style={styles.flames}>
            <Flame color="#ff4d00" height={78} speed={520} delay={0} />
            <Flame color="#ff8c00" height={96} speed={430} delay={120} />
            <Flame color="#ffb703" height={70} speed={610} delay={260} />
            <Flame color="#ffe066" height={50} speed={380} delay={60} />
          </View>
          <Text style={styles.logs}>🪵🪵</Text>
        </View>
      </View>
    </View>
  );
}

function Flame({color, height, speed, delay}) {
  const flicker = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(flicker, {toValue: 1, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(flicker, {toValue: 0.3, duration: speed * 0.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(flicker, {toValue: 0, duration: speed * 0.8, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flicker, speed, delay]);

  return (
    <Animated.View
      style={{
        marginHorizontal: -10,
        transformOrigin: 'bottom',
        opacity: flicker.interpolate({inputRange: [0, 1], outputRange: [0.75, 1]}),
        transform: [
          {translateY: height * 0.08},
          {scaleY: flicker.interpolate({inputRange: [0, 1], outputRange: [0.82, 1.1]})},
          {scaleX: flicker.interpolate({inputRange: [0, 1], outputRange: [1.05, 0.9]})},
          {skewX: flicker.interpolate({inputRange: [0, 0.5, 1], outputRange: ['-4deg', '3deg', '-2deg']})},
        ],
      }}>
      <Svg width={height * 0.6} height={height} viewBox="0 0 60 100">
        <Path d="M30 0 C40 25 58 40 55 68 C53 88 40 100 30 100 C20 100 7 88 5 68 C2 45 22 35 30 0 Z" fill={color} opacity={0.9} />
      </Svg>
    </Animated.View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    page: {paddingTop: 16, gap: 16},
    header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'},
    greeting: {fontSize: 32, fontWeight: 'bold', color: colors.outline, flexShrink: 1},
    normal: {paddingVertical: 8, paddingHorizontal: 14, borderRadius: 100, ...glass(colors, {variant: 'subtle'})},
    normalText: {color: colors.onSurfaceVariant, fontWeight: '600'},
    room: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 24,
      padding: 24,
      borderRadius: 24,
      minHeight: 480,
      ...glass(colors, {variant: 'tinted', tone: 'surfaceAt2'}),
    },
    roomCompact: {flexDirection: 'column', alignItems: 'center'},
    windowFrame: {alignItems: 'center', alignSelf: 'flex-start'},
    window: {
      width: 240,
      height: 280,
      borderRadius: 120,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      overflow: 'hidden',
      borderWidth: 8,
      borderColor: '#e9dcc9',
    },
    barVertical: {position: 'absolute', left: '50%', top: 0, bottom: 0, width: 6, marginLeft: -3, backgroundColor: '#e9dcc9'},
    barHorizontal: {position: 'absolute', top: '52%', left: 0, right: 0, height: 6, backgroundColor: '#e9dcc9'},
    sill: {width: 270, height: 12, borderRadius: 4, backgroundColor: '#d8c7ae'},
    hearth: {alignItems: 'center'},
    mantel: {
      width: 400,
      height: 24,
      borderRadius: 4,
      backgroundColor: '#5b3a24',
      alignItems: 'center',
      zIndex: 2,
    },
    stockings: {fontSize: 30, marginTop: 14},
    surround: {width: 350, height: 280, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end'},
    firebox: {
      width: 220,
      height: 190,
      borderTopLeftRadius: 110,
      borderTopRightRadius: 110,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    flames: {flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14},
    logs: {position: 'absolute', bottom: 0, fontSize: 30},
    treeCorner: {alignItems: 'center'},
    presents: {fontSize: 28, marginTop: -16},
    footer: {padding: 16, borderRadius: 16, ...glass(colors, {variant: 'subtle'})},
    footerText: {fontSize: 16, color: colors.onSurfaceVariant},
  });
