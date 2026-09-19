import {PanResponder, StyleSheet, View} from 'react-native';
import React, {useMemo, useRef, useState} from 'react';

import {useThemedStyles} from '../theme';

const HIT = 8;

/**
 * A drag handle between two panes. `onResize(delta)` is called with the total
 * movement since the drag began, in the axis the divider controls, so the
 * caller applies it to whatever size it started from; `onEnd` is where it
 * persists the result.
 */
export function Divider({direction = 'horizontal', onResize, onEnd, style}) {
  const styles = useThemedStyles(createStyles);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const total = useRef(0);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          total.current = 0;
          setDragging(true);
        },
        onPanResponderMove: (_, gesture) => {
          total.current = direction === 'horizontal' ? gesture.dx : gesture.dy;
          onResize?.(total.current);
        },
        onPanResponderRelease: () => {
          setDragging(false);
          onEnd?.(total.current);
        },
        onPanResponderTerminate: () => {
          setDragging(false);
          onEnd?.(total.current);
        },
      }),
    [direction, onResize, onEnd],
  );

  const horizontal = direction === 'horizontal';

  return (
    <View
      {...responder.panHandlers}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={[horizontal ? styles.vertical : styles.horizontal, style]}
      testID={`divider-${direction}`}>
      <View style={[styles.line, horizontal ? styles.lineVertical : styles.lineHorizontal, (dragging || hovered) && styles.lineActive]} />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  vertical: {
    width: HIT * 2,
    marginHorizontal: -HIT + 4,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'col-resize',
    zIndex: 5,
  },
  horizontal: {
    height: HIT * 2,
    marginVertical: -HIT + 4,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'row-resize',
    zIndex: 5,
  },
  line: {
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  lineVertical: {width: 3, height: '100%'},
  lineHorizontal: {height: 3, width: '100%'},
  lineActive: {
    backgroundColor: colors.primary,
  },
});
