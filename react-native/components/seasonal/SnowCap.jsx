import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Defs, LinearGradient, Path, Stop} from 'react-native-svg';

import {onPointerMove} from './pointer';
import {playEffect} from './store';
import {useSeason} from './useSeason';
import {useWeather} from './data';

/**
 * A drift of snow along the top edge of a card.
 *
 * It builds through the day — a dusting in the morning, a proper drift by the
 * evening — and is deeper when it's actually snowing outside. Sweep the cursor
 * across it and the snow under the cursor falls off (into the snowfall, as a
 * little burst), growing back over the next twenty minutes.
 *
 * Drop it as the first child of any card that doesn't clip its overflow.
 */
const SEGMENTS = 14;
const REGROW_MS = 20 * 60_000;

function dayGrowth(date) {
  const hours = date.getHours() + date.getMinutes() / 60;
  return Math.min(1, Math.max(0.18, (hours - 6) / 14));
}

export function SnowCap({maxHeight = 12, inset = 10}) {
  const {decorated, date} = useSeason(5 * 60_000);
  const weather = useWeather();
  const [width, setWidth] = useState(0);
  const [knockedAt, setKnockedAt] = useState(() => Array(SEGMENTS).fill(0));
  const [, setTick] = useState(0);
  const view = useRef(null);
  const rect = useRef(null);

  // Where the drift is in the window, for the cursor to hit. Cards move
  // (the sidebar collapses, lists scroll), so it is re-measured now and then.
  useEffect(() => {
    if (!decorated) return;
    const measure = () => view.current?.measureInWindow?.((x, y, w, h) => {
      rect.current = {x, y, w, h};
    });
    measure();
    const timer = setInterval(measure, 2000);
    return () => clearInterval(timer);
  }, [decorated, width]);

  useEffect(() => {
    if (!decorated) return;
    return onPointerMove(p => {
      const r = rect.current;
      if (!r || !r.w) return;
      if (p.x < r.x || p.x > r.x + r.w || p.y < r.y - 14 || p.y > r.y + r.h + 26) return;
      if (Math.hypot(p.vx, p.vy) < 2) return;

      const segment = Math.min(SEGMENTS - 1, Math.max(0, Math.floor(((p.x - r.x) / r.w) * SEGMENTS)));
      setKnockedAt(current => {
        const now = Date.now();
        if (now - current[segment] < REGROW_MS / 2) return current;
        playEffect({type: 'burst', x: p.x, y: r.y + r.h, count: 6, power: 3, spread: 'down', width: r.w / SEGMENTS});
        const next = [...current];
        next[segment] = now;
        return next;
      });
    });
  }, [decorated]);

  // Regrowth is slow; checking twice a minute is plenty.
  useEffect(() => {
    if (!knockedAt.some(Boolean)) return;
    const timer = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(timer);
  }, [knockedAt]);

  if (!decorated) return null;

  const weatherFactor = weather.kind === 'snow' ? 1.4 : weather.kind === 'rain' ? 0.55 : 1;
  const height = maxHeight * dayGrowth(date) * weatherFactor;
  const now = Date.now();
  const heights = knockedAt.map((at, index) => {
    const regrown = at ? Math.min(1, (now - at) / REGROW_MS) : 1;
    // A little unevenness so it reads as snow rather than a bar.
    const lumpy = 0.75 + 0.25 * Math.sin(index * 1.7 + 0.6);
    return height * lumpy * regrown;
  });

  return (
    <View
      ref={view}
      pointerEvents="none"
      style={[styles.cap, {left: inset, right: inset, top: -height - 1, height: height + 4}]}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height + 4}>
          <Defs>
            <LinearGradient id="snowcap" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity="0.98" />
              <Stop offset="1" stopColor="#dbe8f7" stopOpacity="0.92" />
            </LinearGradient>
          </Defs>
          <Path d={driftPath(heights, width, height + 4)} fill="url(#snowcap)" />
        </Svg>
      )}
    </View>
  );
}

/**
 * A smooth top over the segment heights, a flat bottom along the card's edge,
 * and rounded ends so it tapers off rather than stopping square.
 */
function driftPath(heights, width, total) {
  const step = width / (heights.length - 1);
  const points = heights.map((h, i) => {
    const taper = i === 0 || i === heights.length - 1 ? 0.15 : i === 1 || i === heights.length - 2 ? 0.7 : 1;
    return [i * step, total - 3 - h * taper];
  });

  let d = `M 0 ${total} L ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    d += ` C ${px + step / 2} ${py} ${x - step / 2} ${y} ${x} ${y}`;
  }
  return d + ` L ${width} ${total} Z`;
}

const styles = StyleSheet.create({
  cap: {
    position: 'absolute',
    zIndex: 5,
  },
});
