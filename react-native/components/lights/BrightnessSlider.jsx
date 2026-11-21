import React, {useId, useRef, useState} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';

import {svgId} from './color';

const HEIGHT = 32;
const THUMB = 26;
const MIN = 1;

// Brightness 1-100, drawn as a track fading from black to the picked colour.
export function BrightnessSlider({value, color, onChange, onChangeEnd, onDragStart, onDragEnd}) {
  const gradientId = svgId(useId());
  const [width, setWidth] = useState(0);
  const offsetX = useRef(0);

  // Keep the thumb fully on the track at both ends.
  const usable = Math.max(width - HEIGHT, 1);

  const pick = x => {
    const fraction = Math.min(Math.max((x - HEIGHT / 2) / usable, 0), 1);
    return Math.round(MIN + fraction * (100 - MIN));
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

  const thumbX = HEIGHT / 2 + ((value - MIN) / (100 - MIN)) * usable;

  return (
    <View
      style={[{height: HEIGHT, alignSelf: 'stretch'}, Platform.OS === 'web' && styles.noTouchScroll]}
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
              <Stop offset="0" stopColor="#000000" />
              <Stop offset="1" stopColor={color} />
            </LinearGradient>
          </Defs>

          <Rect
            x={0}
            y={0}
            width={width}
            height={HEIGHT}
            rx={HEIGHT / 2}
            fill={`url(#${gradientId})`}
          />
        </Svg>
      ) : null}
      <View
        pointerEvents="none"
        style={[styles.thumb, {transform: [{translateX: thumbX - THUMB / 2}]}]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  noTouchScroll: {
    touchAction: 'none',
    userSelect: 'none',
  },
  thumb: {
    position: 'absolute',
    top: (HEIGHT - THUMB) / 2,
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 1},
  },
});
