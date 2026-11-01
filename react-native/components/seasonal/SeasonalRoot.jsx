import {Animated, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Svg, {Defs, RadialGradient, Rect, Stop} from 'react-native-svg';
import {dismissToast, startBlizzard, useSeasonalState} from './store';
import {glass, useThemedStyles} from '../theme';

import {Fireworks} from './Fireworks';
import {YearInReview} from './AdventCalendar';
import {Frost} from './Frost';
import {GrinchNote} from './Grinch';
import {Sleigh} from './Sleigh';
import {Snowballs} from './Snowballs';
import {Snowfall} from './Snowfall';
import {isFireworksTime} from './season';
import {pointerHandlers} from './pointer';
import {useCompactLayout} from '../useCompactLayout';
import {useSeason} from './useSeason';
import {useWeather} from './data';

/**
 * Wraps the whole app. It tracks the cursor for the snow and frost, turns a
 * click on bare glass into a snowball, and lays the season's overlay — frost,
 * snowfall, the sleigh, fireworks, the Grinch's note, toasts — over
 * everything. Out of season it renders its children and nothing else.
 */
export function SeasonalRoot({children}) {
  const season = useSeason(30_000);
  const [size, setSize] = useState({width: 0, height: 0});
  const [balls, setBalls] = useState([]);
  const press = useRef(null);

  const fireworks = isFireworksTime(season.date);
  const active = season.decorated || season.grinchActive || fireworks;

  useHohohoEasterEgg(season.decorated);

  // A click that nothing else wanted — on the glass between cards — throws a
  // snowball there. Responder negotiation runs from the deepest view up, so
  // buttons, inputs and lists claim their own touches first.
  const responder = season.decorated
    ? {
        onStartShouldSetResponder: () => true,
        onResponderGrant: event => {
          press.current = {x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, at: Date.now()};
        },
        onResponderRelease: event => {
          const start = press.current;
          const {pageX, pageY} = event.nativeEvent;
          if (!start || Date.now() - start.at > 400 || Math.hypot(pageX - start.x, pageY - start.y) > 8) return;
          setBalls(current => [...current.slice(-6), {id: Date.now(), x: pageX, y: pageY}]);
        },
        onResponderTerminationRequest: () => true,
      }
    : {};

  const removeBall = useCallback(id => setBalls(current => current.filter(ball => ball.id !== id)), []);

  return (
    <View
      style={styles.root}
      {...(active ? pointerHandlers : {})}
      {...responder}
      onLayout={event => setSize({width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height})}>
      {season.cozy && <CozyGlow size={size} />}
      {children}
      {active && <SeasonalOverlay season={season} size={size} balls={balls} removeBall={removeBall} fireworks={fireworks} />}
    </View>
  );
}

function SeasonalOverlay({season, size, balls, removeBall, fireworks}) {
  const weather = useWeather();
  const blizzardUntil = useSeasonalState(s => s.blizzardUntil);
  const [, rerender] = useState(0);

  // Re-render when a blizzard ends so the snowfall calms down again.
  useEffect(() => {
    const left = blizzardUntil - Date.now();
    if (left <= 0) return;
    const timer = setTimeout(() => rerender(n => n + 1), left + 50);
    return () => clearTimeout(timer);
  }, [blizzardUntil]);

  let intensity = 'light';
  if (weather.kind === 'snow') intensity = 'snow';
  if (weather.kind === 'rain') intensity = 'rain';
  if (blizzardUntil > Date.now()) intensity = 'blizzard';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {season.decorated && Platform.OS !== 'ios' && <Frost />}
      {season.decorated && <Snowfall intensity={intensity} />}
      {season.decorated && <Snowballs balls={balls} size={size} onDone={removeBall} />}
      {season.decorated && <Sleigh width={size.width} />}
      <Fireworks active={fireworks} size={size} />
      <GrinchNote />
      <YearInReview />
      <Toast />
    </View>
  );
}

/**
 * After ten at night: the window warms up from the edges like it's lit by a
 * fire, and the room goes a little dimmer around the content.
 */
function CozyGlow({size}) {
  if (!size.width) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={size.width} height={size.height}>
        <Defs>
          <RadialGradient id="cozy" cx="50%" cy="60%" r="75%">
            <Stop offset="0.45" stopColor="#ff9d3c" stopOpacity="0" />
            <Stop offset="1" stopColor="#ff7a1a" stopOpacity="0.22" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size.width} height={size.height} fill="url(#cozy)" />
      </Svg>
    </View>
  );
}

function Toast() {
  const styles = useThemedStyles(createStyles);
  const toast = useSeasonalState(s => s.toast);
  const compact = useCompactLayout();
  const appear = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!toast) return;
    appear.setValue(0);
    Animated.spring(appear, {toValue: 1, useNativeDriver: true, friction: 7}).start();
    const timer = setTimeout(dismissToast, 9000);
    return () => clearTimeout(timer);
  }, [toast, appear]);

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        compact && styles.toastCompact,
        {opacity: appear, transform: [{translateY: appear.interpolate({inputRange: [0, 1], outputRange: [-30, 0]})}]},
      ]}>
      <Pressable onPress={dismissToast} style={styles.toastInner}>
        <Text style={styles.toastEmoji}>{toast.emoji}</Text>
        <View style={styles.toastText}>
          <Text style={styles.toastTitle}>{toast.title}</Text>
          {toast.body ? <Text style={styles.toastBody}>{toast.body}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Type "hohoho" anywhere for ten seconds of blizzard. Only the web build has a
 * document to listen on; elsewhere the message box catches it (MessageInput).
 */
function useHohohoEasterEgg(enabled) {
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof document === 'undefined') return;
    let typed = '';
    const onKey = event => {
      if (event.key?.length !== 1) return;
      typed = (typed + event.key.toLowerCase()).slice(-6);
      if (typed === 'hohoho') startBlizzard(10);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);
}

const styles = StyleSheet.create({
  root: {flex: 1},
});

const createStyles = colors =>
  StyleSheet.create({
    toast: {
      position: 'absolute',
      top: 56,
      alignSelf: 'center',
      maxWidth: 460,
      zIndex: 40,
    },
    toastCompact: {
      top: 60,
      left: 16,
      right: 16,
      maxWidth: undefined,
    },
    toastInner: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      ...glass(colors, {variant: 'primaryContainer'}),
    },
    toastEmoji: {fontSize: 30},
    toastText: {flexShrink: 1, gap: 4},
    toastTitle: {fontSize: 16, fontWeight: 'bold', color: colors.onPrimaryContainer ?? colors.onSurface},
    toastBody: {fontSize: 14, color: colors.onPrimaryContainer ?? colors.onSurfaceVariant},
  });
