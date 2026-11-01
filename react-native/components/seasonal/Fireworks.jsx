import {Animated, Easing, StyleSheet, View} from 'react-native';
import React, {useEffect, useMemo, useState} from 'react';

import {onEffect} from './store';

/**
 * Fireworks across the whole window: from midnight on New Year's for half an
 * hour, and as a short celebration when something is won (the Grinch beaten).
 * Each shell is a rocket up and a ring of sparks that fall and fade, all on
 * the native driver.
 */
const COLORS = ['#ff4d6d', '#ffd23f', '#3ddc97', '#4fb6ff', '#c77dff', '#ffffff', '#ff9f1c'];
const SPARKS = 26;

export function Fireworks({active, size}) {
  const [shells, setShells] = useState([]);
  const [showUntil, setShowUntil] = useState(0);

  useEffect(() => onEffect(effect => effect.type === 'fireworks' && setShowUntil(Date.now() + (effect.seconds ?? 8) * 1000)), []);

  const running = active || showUntil > Date.now();

  useEffect(() => {
    if (!running || !size.width) return;
    const timer = setInterval(() => {
      if (!active && Date.now() > showUntil) {
        setShowUntil(0);
        return;
      }
      setShells(current => [
        ...current.filter(shell => Date.now() - shell.id < 2600),
        {
          id: Date.now() + Math.random(),
          x: size.width * (0.12 + Math.random() * 0.76),
          y: size.height * (0.12 + Math.random() * 0.35),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          radius: 70 + Math.random() * 70,
        },
      ]);
    }, 650);
    return () => clearInterval(timer);
  }, [running, active, showUntil, size.width, size.height]);

  // Let the last shells finish, then drop them.
  useEffect(() => {
    if (running || shells.length === 0) return;
    const timer = setTimeout(() => setShells([]), 2600);
    return () => clearTimeout(timer);
  }, [running, shells.length]);

  if (!running && shells.length === 0) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {shells.map(shell => (
        <Shell key={shell.id} shell={shell} height={size.height} />
      ))}
    </View>
  );
}

function Shell({shell, height}) {
  const rise = useMemo(() => new Animated.Value(0), []);
  const burst = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(rise, {toValue: 1, duration: 750, easing: Easing.out(Easing.quad), useNativeDriver: true}),
      Animated.timing(burst, {toValue: 1, duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
    ]).start();
  }, [rise, burst]);

  return (
    <>
      <Animated.View
        style={[
          styles.rocket,
          {
            backgroundColor: shell.color,
            opacity: burst.interpolate({inputRange: [0, 0.05], outputRange: [1, 0], extrapolate: 'clamp'}),
            transform: [{translateX: shell.x}, {translateY: rise.interpolate({inputRange: [0, 1], outputRange: [height, shell.y]})}],
          },
        ]}
      />
      {Array.from({length: SPARKS}, (_, i) => {
        const angle = (i / SPARKS) * Math.PI * 2;
        const dx = Math.cos(angle) * shell.radius;
        const dy = Math.sin(angle) * shell.radius;
        return (
          <Animated.View
            key={i}
            style={[
              styles.spark,
              {
                backgroundColor: shell.color,
                opacity: burst.interpolate({inputRange: [0, 0.02, 0.7, 1], outputRange: [0, 1, 0.8, 0]}),
                transform: [
                  {translateX: burst.interpolate({inputRange: [0, 1], outputRange: [shell.x, shell.x + dx]})},
                  // Out along the ray, and gravity pulling the whole ring down as it fades.
                  {translateY: burst.interpolate({inputRange: [0, 0.5, 1], outputRange: [shell.y, shell.y + dy * 0.85 + 8, shell.y + dy + 45]})},
                ],
              },
            ]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  rocket: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 3,
    height: 10,
    borderRadius: 2,
  },
  spark: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
