import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';

import {useSeason} from './useSeason';

/** Sits, tilted, on the sidebar logo for the season. */
export function SantaHat({size = 24}) {
  const {decorated} = useSeason(10 * 60_000);
  if (!decorated) return null;

  const width = size * 1.05;
  return (
    <View pointerEvents="none" style={[styles.hat, {left: -size * 0.12, top: -size * 0.62, width, height: width}]}>
      <Svg width={width} height={width} viewBox="0 0 40 40">
        <Path d="M6 30 C10 16 18 6 30 6 C34 6 37 10 36 16 C33 12 30 12 28 14 C29 20 30 25 32 30 Z" fill="#d62839" />
        <Path d="M4 29 Q19 24 34 29 Q35 33 34 35 Q19 31 4 35 Q3 32 4 29 Z" fill="#f8f9fa" />
        <Circle cx="36" cy="17" r="4" fill="#f8f9fa" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  hat: {
    position: 'absolute',
    transform: [{rotate: '-18deg'}],
  },
});
