import React, {useRef} from 'react';
import {Image, Platform, StyleSheet, View} from 'react-native';

import {hsvToHex} from './color';
import wheelImage from './wheel.png';

// Metro hands back an asset id, Vite a URL.
const WHEEL_SOURCE = typeof wheelImage === 'string' ? {uri: wheelImage} : wheelImage;
const THUMB = 30;

// Hue runs around the wheel, saturation from white in the centre to the full
// colour at the edge. The wheel itself is a pre-rendered image (generated with
// the same HSV maths as `hsvToHex`), so dragging only moves the thumb.
export function ColorWheel({size, hue, saturation, onChange, onChangeEnd, onDragStart, onDragEnd}) {
  const radius = size / 2;
  const offset = useRef({x: 0, y: 0});

  const pick = (x, y) => {
    const dx = x - radius;
    const dy = y - radius;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    return {
      hue: (angle + 360) % 360,
      saturation: Math.min(Math.hypot(dx, dy) / radius, 1),
    };
  };

  // locationX is only reliable on the first touch, so remember where the
  // wheel sits on the page and work from pageX/pageY afterwards.
  const handleGrant = event => {
    const {locationX, locationY, pageX, pageY} = event.nativeEvent;
    offset.current = {x: pageX - locationX, y: pageY - locationY};
    onDragStart?.();
    onChange(pick(locationX, locationY));
  };

  const handleMove = event => {
    const {pageX, pageY} = event.nativeEvent;
    onChange(pick(pageX - offset.current.x, pageY - offset.current.y));
  };

  const handleRelease = event => {
    const {pageX, pageY} = event.nativeEvent;
    onChangeEnd?.(pick(pageX - offset.current.x, pageY - offset.current.y));
    onDragEnd?.();
  };

  const angle = (hue * Math.PI) / 180;
  const thumbX = radius + Math.cos(angle) * saturation * radius;
  const thumbY = radius + Math.sin(angle) * saturation * radius;

  return (
    <View
      style={[{width: size, height: size}, Platform.OS === 'web' && styles.noTouchScroll]}
      onStartShouldSetResponder={() => true}
      onStartShouldSetResponderCapture={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={() => onDragEnd?.()}>
      <Image
        source={WHEEL_SOURCE}
        style={{width: size, height: size}}
        pointerEvents="none"
        draggable={false}
      />
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            backgroundColor: hsvToHex(hue, saturation),
            transform: [{translateX: thumbX - THUMB / 2}, {translateY: thumbY - THUMB / 2}],
          },
        ]}
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
    top: 0,
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 1},
  },
});
