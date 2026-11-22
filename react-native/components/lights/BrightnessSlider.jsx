import React, {useId, useRef, useState} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import Svg, {Circle, Defs, G, Line, LinearGradient, Rect, Stop} from 'react-native-svg';

import {MAX_LEVEL, MIN_LEVEL, hsvToHex, svgId} from './color';

const HEIGHT = 36;
const THUMB = 28;
const PAD = (HEIGHT - THUMB) / 2;

// Lamp level 1-254, drawn as a track glowing from a dim version of the colour
// up to the colour itself, with a filled part up to the thumb.
export function BrightnessSlider({value, hue, saturation, onChange, onChangeEnd, onDragStart, onDragEnd}) {
  const gradientId = svgId(useId());
  const [width, setWidth] = useState(0);
  const offsetX = useRef(0);

  // The thumb's centre travels between PAD + THUMB/2 at both ends, so it never leaves the track.
  const start = PAD + THUMB / 2;
  const usable = Math.max(width - 2 * start, 1);

  const pick = x => {
    const fraction = Math.min(Math.max((x - start) / usable, 0), 1);
    return Math.round(MIN_LEVEL + fraction * (MAX_LEVEL - MIN_LEVEL));
  };

  const handleGrant = event => {
    const {locationX, pageX} = event.nativeEvent;
    offsetX.current = pageX - locationX;
    onDragStart?.();
    onChange(pick(locationX));
  };

  const handleMove = event => {
    onChange(pick(event.nativeEvent.pageX - offsetX.current));
  };

  const handleRelease = event => {
    onChangeEnd?.(pick(event.nativeEvent.pageX - offsetX.current));
    onDragEnd?.();
  };

  const fraction = (value - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL);
  const thumbX = start + fraction * usable;
  const full = hsvToHex(hue, saturation);
  const dim = hsvToHex(hue, saturation, 0.18);
  const current = hsvToHex(hue, saturation, 0.3 + 0.7 * fraction);

  return (
    <View
      style={[styles.root, Platform.OS === 'web' && styles.noTouchScroll]}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onStartShouldSetResponderCapture={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={() => onDragEnd?.()}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT} pointerEvents="none">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={dim} />
              <Stop offset="1" stopColor={full} />
            </LinearGradient>
          </Defs>

          {/* Unfilled track: the gradient, heavily faded. */}
          <Rect x={0} y={0} width={width} height={HEIGHT} rx={HEIGHT / 2} fill={`url(#${gradientId})`} opacity={0.28} />
          {/* Filled part, up to and around the thumb. */}
          <Rect
            x={0}
            y={0}
            width={Math.min(thumbX + THUMB / 2 + PAD, width)}
            height={HEIGHT}
            rx={HEIGHT / 2}
            fill={`url(#${gradientId})`}
          />

          {/* Small sun at the dim end, big sun at the bright end. */}
          <Sun x={start} y={HEIGHT / 2} radius={3} rays={5.5} opacity={fraction > 0.1 ? 0.6 : 0} />
          <Sun x={width - start} y={HEIGHT / 2} radius={4} rays={7.5} opacity={fraction < 0.88 ? 0.7 : 0} />
        </Svg>
      ) : null}
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {backgroundColor: current, transform: [{translateX: thumbX - THUMB / 2}]},
        ]}
      />
    </View>
  );
}

function Sun({x, y, radius, rays, opacity}) {
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <G opacity={opacity}>
      <Circle cx={x} cy={y} r={radius} fill="#ffffff" />
      {angles.map(angle => {
        const rad = (angle * Math.PI) / 180;
        return (
          <Line
            key={angle}
            x1={x + Math.cos(rad) * (radius + 1.5)}
            y1={y + Math.sin(rad) * (radius + 1.5)}
            x2={x + Math.cos(rad) * rays}
            y2={y + Math.sin(rad) * rays}
            stroke="#ffffff"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        );
      })}
    </G>
  );
}

const styles = StyleSheet.create({
  root: {
    height: HEIGHT,
    alignSelf: 'stretch',
  },
  noTouchScroll: {
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'pointer',
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: {width: 0, height: 2},
  },
});
