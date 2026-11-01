import {Animated, Easing, Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useMemo, useState} from 'react';

import {fetchSeasonal} from './data';
import {showToast} from './store';

/**
 * Every so often Santa crosses the window. Catch him (click the sleigh) and
 * he drops a present: one of the advent doors you've unlocked, or a joke.
 */
const FIRST_FLIGHT_MS = [2 * 60_000, 6 * 60_000];
const BETWEEN_FLIGHTS_MS = [15 * 60_000, 40 * 60_000];
const FLIGHT_MS = 11_000;

const JOKES = [
  "What do you call Santa's helpers? Subordinate clauses.",
  'Why was the snowman looking through the carrots? He was picking his nose.',
  'What does Santa do in his garden? Hoe hoe hoe.',
  "Why does Santa's sleigh get such good mileage? Long-distance reindeer.",
  'What do you call a cat on the beach at Christmas? Sandy Claws.',
  'How do sheep say Merry Christmas? Fleece Navidad.',
  'Your present is: one (1) present. Unwrapping not included.',
  "What's every elf's favourite music? Wrap.",
];

const between = ([min, max]) => min + Math.random() * (max - min);

export function Sleigh({width}) {
  const [flight, setFlight] = useState(null);
  const progress = useMemo(() => new Animated.Value(0), []);
  const bob = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let timer = setTimeout(function launch() {
      setFlight({id: Date.now(), top: 40 + Math.random() * 90, leftToRight: Math.random() < 0.5});
      timer = setTimeout(launch, between(BETWEEN_FLIGHTS_MS));
    }, between(FIRST_FLIGHT_MS));
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!flight) return;
    progress.setValue(0);
    const bobbing = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(bob, {toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ]),
    );
    bobbing.start();
    Animated.timing(progress, {toValue: 1, duration: FLIGHT_MS, easing: Easing.linear, useNativeDriver: true}).start(() => {
      bobbing.stop();
      setFlight(null);
    });
    return () => bobbing.stop();
  }, [flight, progress, bob]);

  if (!flight || !width) return null;

  const from = flight.leftToRight ? -220 : width + 20;
  const to = flight.leftToRight ? width + 20 : -220;

  async function catchIt() {
    setFlight(null);
    try {
      const advent = await fetchSeasonal('/seasonal/advent');
      const doors = advent?.doors ?? [];
      if (doors.length && Math.random() < 0.6) {
        const door = doors[Math.floor(Math.random() * doors.length)];
        showToast({emoji: '🎁', title: `You caught Santa! ${door.emoji} ${door.title}`, body: door.body});
        return;
      }
    } catch {}
    showToast({emoji: '🎁', title: 'You caught Santa!', body: JOKES[Math.floor(Math.random() * JOKES.length)]});
  }

  return (
    <Animated.View
      style={[
        styles.sleigh,
        {
          top: flight.top,
          transform: [
            {translateX: progress.interpolate({inputRange: [0, 1], outputRange: [from, to]})},
            {translateY: Animated.add(bob.interpolate({inputRange: [0, 1], outputRange: [-6, 6]}), progress.interpolate({inputRange: [0, 0.5, 1], outputRange: [20, -10, 15]}))},
          ],
        },
      ]}>
      <Pressable onPress={catchIt} hitSlop={12}>
        {/* The emoji face left, so the whole team is mirrored when flying right. */}
        <View style={[styles.team, flight.leftToRight && styles.mirrored]}>
          <Text style={styles.emoji}>🦌</Text>
          <Text style={styles.emoji}>🦌</Text>
          <Text style={styles.emoji}>🦌</Text>
          <Text style={[styles.emoji, styles.santa]}>🛷</Text>
          <Text style={styles.rider}>🎅</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sleigh: {
    position: 'absolute',
    left: 0,
    zIndex: 20,
  },
  team: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  mirrored: {
    transform: [{scaleX: -1}],
  },
  emoji: {
    fontSize: 26,
    marginRight: -4,
  },
  santa: {
    fontSize: 34,
    marginLeft: 6,
  },
  rider: {
    fontSize: 22,
    position: 'absolute',
    right: 6,
    bottom: 14,
  },
});
