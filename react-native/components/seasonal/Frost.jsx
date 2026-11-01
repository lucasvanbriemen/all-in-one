import React, {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Circle, Defs, G, LinearGradient, Mask, Path, Rect, Stop} from 'react-native-svg';

import {onPointerMove} from './pointer';
import {useWeather} from './data';

/**
 * Frost creeping in from the edges of the window, thicker the colder it is
 * outside. Drag the cursor through it and it wipes clear, like a fogged-up
 * window, then slowly mists over again.
 *
 * The frost is four edge gradients plus a scatter of ice crystals, drawn once;
 * the wiping is a mask of black circles that fade back to nothing.
 */
const REFOG_MS = 45_000;
const MAX_WIPES = 90;

function coldness(temperature) {
  if (temperature == null) return 0.5;
  return Math.min(1, Math.max(0.2, (8 - temperature) / 13));
}

function crystals(width, height, depth) {
  const result = [];
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  for (let i = 0; i < 46; i++) {
    const edge = i % 4;
    const along = random();
    const into = random() ** 1.8 * depth * 0.9;
    const x = edge === 0 ? along * width : edge === 1 ? width - into : edge === 2 ? along * width : into;
    const y = edge === 0 ? into : edge === 1 ? along * height : edge === 2 ? height - into : along * height;
    const size = 5 + random() * 14 * (1 - into / depth);

    let d = '';
    for (let arm = 0; arm < 6; arm++) {
      const angle = (arm * Math.PI) / 3 + random() * 0.2;
      const ex = x + Math.cos(angle) * size;
      const ey = y + Math.sin(angle) * size;
      d += `M ${x} ${y} L ${ex} ${ey} `;
      // Two little barbs per arm.
      const bx = x + Math.cos(angle) * size * 0.6;
      const by = y + Math.sin(angle) * size * 0.6;
      d += `M ${bx} ${by} L ${bx + Math.cos(angle + 0.7) * size * 0.3} ${by + Math.sin(angle + 0.7) * size * 0.3} `;
      d += `M ${bx} ${by} L ${bx + Math.cos(angle - 0.7) * size * 0.3} ${by + Math.sin(angle - 0.7) * size * 0.3} `;
    }
    result.push(d);
  }
  return result.join('');
}

export function Frost() {
  const {temperature} = useWeather();
  const [size, setSize] = useState({width: 0, height: 0});
  const [wipes, setWipes] = useState([]);
  const pending = useRef([]);
  const flush = useRef(null);

  const cold = coldness(temperature);
  const depth = Math.round(36 + 110 * cold);
  const pattern = useMemo(() => (size.width ? crystals(size.width, size.height, depth) : ''), [size, depth]);

  // Points arrive on every mouse move; they are batched into one re-render
  // every 50ms, and only kept where there is frost to wipe.
  useEffect(
    () =>
      onPointerMove(p => {
        const {width, height} = size;
        const inBand = p.x < depth * 1.1 || p.y < depth * 1.1 || p.x > width - depth * 1.1 || p.y > height - depth * 1.1;
        if (!inBand) return;
        const last = pending.current[pending.current.length - 1];
        if (last && Math.hypot(last.x - p.x, last.y - p.y) < 10) return;
        pending.current.push({x: p.x, y: p.y, at: Date.now()});

        flush.current ??= setTimeout(() => {
          flush.current = null;
          const added = pending.current;
          pending.current = [];
          setWipes(current => [...current, ...added].slice(-MAX_WIPES));
        }, 50);
      }),
    [size, depth],
  );

  // Refog: fade the wipes by re-rendering once a second until all are gone.
  useEffect(() => {
    if (wipes.length === 0) return;
    const timer = setInterval(() => {
      setWipes(current => current.filter(w => Date.now() - w.at < REFOG_MS));
    }, 1000);
    return () => clearInterval(timer);
  }, [wipes.length]);

  const {width, height} = size;
  const now = Date.now();
  const strength = 0.3 + cold * 0.35;

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={event => setSize({width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height})}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="frostTop" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#f4f9ff" stopOpacity={strength} />
              <Stop offset="1" stopColor="#f4f9ff" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="frostBottom" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor="#f4f9ff" stopOpacity={strength} />
              <Stop offset="1" stopColor="#f4f9ff" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="frostLeft" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#f4f9ff" stopOpacity={strength} />
              <Stop offset="1" stopColor="#f4f9ff" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="frostRight" x1="1" y1="0" x2="0" y2="0">
              <Stop offset="0" stopColor="#f4f9ff" stopOpacity={strength} />
              <Stop offset="1" stopColor="#f4f9ff" stopOpacity="0" />
            </LinearGradient>
            <Mask id="frostWipes" x="0" y="0" width={width} height={height} maskUnits="userSpaceOnUse">
              <Rect x="0" y="0" width={width} height={height} fill="white" />
              {wipes.map((wipe, index) => (
                <Circle key={index} cx={wipe.x} cy={wipe.y} r={26} fill="black" opacity={Math.max(0, 1 - (now - wipe.at) / REFOG_MS)} />
              ))}
            </Mask>
          </Defs>

          <G mask="url(#frostWipes)">
            <Rect x="0" y="0" width={width} height={depth} fill="url(#frostTop)" />
            <Rect x="0" y={height - depth} width={width} height={depth} fill="url(#frostBottom)" />
            <Rect x="0" y="0" width={depth} height={height} fill="url(#frostLeft)" />
            <Rect x={width - depth} y="0" width={depth} height={height} fill="url(#frostRight)" />
            <Path d={pattern} stroke="#ffffff" strokeWidth={0.8} strokeLinecap="round" opacity={0.35 + cold * 0.3} />
          </G>
        </Svg>
      )}
    </View>
  );
}
