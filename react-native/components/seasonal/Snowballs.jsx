import {Animated, Easing, StyleSheet, View} from 'react-native';
import React, {useEffect, useMemo} from 'react';
import Svg, {Path} from 'react-native-svg';

/**
 * Snowballs thrown at the glass. Each flies in from below, splats where you
 * clicked, slides a little way down the pane and melts away.
 */
export function Snowballs({balls, size, onDone}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {balls.map(ball => (
        <Snowball key={ball.id} ball={ball} size={size} onDone={() => onDone(ball.id)} />
      ))}
    </View>
  );
}

function Snowball({ball, size, onDone}) {
  const flight = useMemo(() => new Animated.Value(0), []);
  const splat = useMemo(() => new Animated.Value(0), []);
  const slide = useMemo(() => new Animated.Value(0), []);
  const shape = useMemo(() => splatPath(), []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(flight, {toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true}),
      Animated.timing(splat, {toValue: 1, duration: 90, useNativeDriver: true}),
      Animated.timing(slide, {toValue: 1, duration: 4200, easing: Easing.in(Easing.quad), useNativeDriver: true}),
    ]).start(onDone);
  }, [flight, splat, slide, onDone]);

  const fromX = size.width / 2 + (ball.x - size.width / 2) * 0.3;
  const fromY = size.height + 40;

  return (
    <>
      <Animated.View
        style={[
          styles.ball,
          {
            opacity: splat.interpolate({inputRange: [0, 1], outputRange: [1, 0]}),
            transform: [
              {translateX: flight.interpolate({inputRange: [0, 1], outputRange: [fromX - 14, ball.x - 14]})},
              {translateY: flight.interpolate({inputRange: [0, 1], outputRange: [fromY, ball.y - 14]})},
              {scale: flight.interpolate({inputRange: [0, 1], outputRange: [2.2, 1]})},
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.splat,
          {
            opacity: Animated.multiply(splat, slide.interpolate({inputRange: [0, 0.6, 1], outputRange: [1, 0.8, 0]})),
            transform: [
              {translateX: ball.x - 40},
              {translateY: Animated.add(ball.y - 40, slide.interpolate({inputRange: [0, 1], outputRange: [0, 70]}))},
              {scaleY: slide.interpolate({inputRange: [0, 1], outputRange: [1, 1.35]})},
            ],
          },
        ]}>
        <Svg width={80} height={80} viewBox="0 0 80 80">
          <Path d={shape} fill="rgba(255,255,255,0.92)" stroke="rgba(120,145,180,0.5)" strokeWidth={0.8} />
        </Svg>
      </Animated.View>
    </>
  );
}

/** A lumpy star of snow: a blob with a few chunks thrown out from it. */
function splatPath() {
  const points = 14;
  let d = '';
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const r = 15 + Math.random() * 9 + (i % 3 === 0 ? 8 : 0);
    const x = 40 + Math.cos(angle) * r;
    const y = 40 + Math.sin(angle) * r;
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  d += ' Z';
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 28 + Math.random() * 8;
    const x = 40 + Math.cos(angle) * r;
    const y = 40 + Math.sin(angle) * r;
    const s = 2 + Math.random() * 3;
    d += ` M ${x - s} ${y} a ${s} ${s} 0 1 0 ${s * 2} 0 a ${s} ${s} 0 1 0 ${-s * 2} 0`;
  }
  return d;
}

const styles = StyleSheet.create({
  ball: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7e4f2',
  },
  splat: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 80,
    height: 80,
  },
});
