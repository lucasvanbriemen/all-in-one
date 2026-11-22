import React, {useRef} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';

import {hsvToHex} from './color';

const MARKER = 28;
const SELECTED_MARKER = 38;
// How close (in points) a touch has to land to a marker to grab it.
const GRAB_DISTANCE = 30;

const sameColour = (a, b) =>
  Math.abs(a.saturation - b.saturation) < 0.02 &&
  (a.saturation < 0.02 || Math.abs(((a.hue - b.hue + 540) % 360) - 180) < 2);

// A round picker with one marker per lamp, like the Hue app.
//
// The wheel only knows positions (x and y, -1..1). `fromPosition` turns a
// position into {hue, saturation} and `toPosition` goes back, so the colour
// and white wheels differ only in those two functions and their background.
//
// Grabbing a marker selects and drags that lamp; touching anywhere else moves
// the selected lamp there.
export function Wheel({
  size,
  background,
  fromPosition,
  toPosition,
  markers,
  selectedId,
  onSelect,
  onChange,
  onChangeEnd,
  onDragStart,
  onDragEnd,
}) {
  const radius = size / 2;
  const offset = useRef({x: 0, y: 0});
  const dragging = useRef(null);
  // Where each marker was dropped. A colour can map to several spots (the
  // white wheel), so a marker stays where it was put as long as it still
  // shows the same colour.
  const positions = useRef({});

  const positionOf = marker => {
    const remembered = positions.current[marker.id];
    if (remembered && sameColour(fromPosition(remembered), marker)) return remembered;
    return toPosition(marker);
  };

  const pick = (px, py) => {
    let x = (px - radius) / radius;
    let y = (py - radius) / radius;
    const distance = Math.hypot(x, y);
    if (distance > 1) {
      x /= distance;
      y /= distance;
    }
    positions.current[dragging.current] = {x, y};
    return fromPosition({x, y});
  };

  const handleGrant = event => {
    const {locationX, locationY, pageX, pageY} = event.nativeEvent;
    offset.current = {x: pageX - locationX, y: pageY - locationY};

    // Nearest marker under the finger, otherwise the selected lamp.
    let nearest = null;
    let nearestDistance = GRAB_DISTANCE;
    markers.forEach(marker => {
      const {x, y} = positionOf(marker);
      const distance = Math.hypot(radius + x * radius - locationX, radius + y * radius - locationY);
      if (distance < nearestDistance) {
        nearest = marker.id;
        nearestDistance = distance;
      }
    });

    dragging.current = nearest ?? selectedId;
    if (dragging.current == null) return;
    if (dragging.current !== selectedId) onSelect(dragging.current);

    onDragStart?.();
    onChange(dragging.current, pick(locationX, locationY));
  };

  const handleMove = event => {
    if (dragging.current == null) return;
    const {pageX, pageY} = event.nativeEvent;
    onChange(dragging.current, pick(pageX - offset.current.x, pageY - offset.current.y));
  };

  const handleRelease = event => {
    if (dragging.current == null) return;
    const {pageX, pageY} = event.nativeEvent;
    onChangeEnd(dragging.current, pick(pageX - offset.current.x, pageY - offset.current.y));
    dragging.current = null;
    onDragEnd?.();
  };

  // The selected marker is drawn last, so it sits on top.
  const ordered = [...markers].sort((a, b) => (a.id === selectedId) - (b.id === selectedId));

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
      onResponderTerminate={() => {
        dragging.current = null;
        onDragEnd?.();
      }}>
      {background}
      {ordered.map(marker => {
        const {x, y} = positionOf(marker);
        const selected = marker.id === selectedId;
        const markerSize = selected ? SELECTED_MARKER : MARKER;
        const fill = hsvToHex(marker.hue, marker.saturation);
        return (
          <View
            key={marker.id}
            pointerEvents="none"
            style={[
              styles.marker,
              {
                width: markerSize,
                height: markerSize,
                borderRadius: markerSize / 2,
                borderWidth: selected ? 4 : 3,
                backgroundColor: fill,
                opacity: marker.on ? 1 : 0.55,
                transform: [
                  {translateX: radius + x * radius - markerSize / 2},
                  {translateY: radius + y * radius - markerSize / 2},
                ],
              },
            ]}>
            <Text style={[styles.label, {color: isLight(marker) ? '#1a1a1a' : '#ffffff', fontSize: selected ? 14 : 11}]}>
              {marker.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// Dark text on pale colours, white text on strong ones.
function isLight({hue, saturation}) {
  const yellowish = hue > 40 && hue < 200;
  return saturation < 0.45 || yellowish;
}

const styles = StyleSheet.create({
  noTouchScroll: {
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'pointer',
  },
  marker: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: {width: 0, height: 2},
  },
  label: {
    fontWeight: '700',
  },
});
