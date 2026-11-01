import {Animated, Platform, StyleSheet, View} from 'react-native';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import {onEffect} from './store';
import {pointer} from './pointer';

/**
 * Snow (or, this being the Netherlands, rain) over the whole window.
 *
 * The flakes are simulated in JS so they can react to things — the cursor
 * pushes them aside, a festive message or a knocked-off drift throws a burst
 * of them — and only their positions are written to Animated values each
 * frame, so React never re-renders during the fall.
 *
 * One fixed pool of views is kept mounted; flakes not in use are parked off
 * screen. Changing the intensity only changes how many are in use.
 */
const POOL = 170;
const FPS = Platform.OS === 'web' ? 60 : 30;
const REPEL_RADIUS = 90;

const COUNTS = {light: 36, snow: 80, blizzard: 150, rain: 70};

function makeFlake(width, height, spawnAnywhere) {
  const r = 1.2 + Math.random() * 2.6;
  return {
    x: Math.random() * width,
    y: spawnAnywhere ? Math.random() * height : -10 - Math.random() * 40,
    r,
    vx: 0,
    vy: 0.35 + r * 0.22 + Math.random() * 0.3,
    phase: Math.random() * Math.PI * 2,
    sway: 0.2 + Math.random() * 0.5,
    burst: false,
    active: false,
  };
}

export function Snowfall({intensity = 'light'}) {
  const [size, setSize] = useState({width: 0, height: 0});
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const rain = intensity === 'rain';
  const blizzard = intensity === 'blizzard';
  const target = COUNTS[intensity] ?? COUNTS.light;
  const settings = useRef({target, rain, blizzard});
  settings.current = {target, rain, blizzard};

  const flakes = useRef(null);
  const values = useMemo(() => Array.from({length: POOL}, () => new Animated.ValueXY({x: -100, y: -100})), []);
  // Radius only matters for how a flake looks, so it is fixed per slot.
  const radii = useMemo(() => Array.from({length: POOL}, () => 1.2 + Math.random() * 2.6), []);

  useEffect(() => {
    let frame;
    let last = 0;
    let wind = 0;

    function step(time) {
      frame = requestAnimationFrame(step);
      if (time - last < 1000 / FPS - 2) return;
      const dt = last ? Math.min(3, (time - last) / (1000 / 60)) : 1;
      last = time;

      const {width, height} = sizeRef.current;
      if (!width || !height) return;

      if (!flakes.current) {
        flakes.current = radii.map(r => ({...makeFlake(width, height, true), r}));
      }

      const {target: wanted, rain: isRain, blizzard: isBlizzard} = settings.current;
      wind += ((isBlizzard ? 2.2 : 0.15) * Math.sin(time / 4000) - wind) * 0.01;

      let regular = 0;
      flakes.current.forEach((flake, index) => {
        if (!flake.burst) {
          regular += 1;
          flake.active = regular <= wanted;
        }

        if (!flake.active) {
          if (flake.parked !== true) {
            values[index].setValue({x: -100, y: -100});
            flake.parked = true;
            // Re-enter from the top when it is wanted again.
            Object.assign(flake, makeFlake(width, height, false), {r: flake.r, active: false});
          }
          return;
        }
        flake.parked = false;

        if (flake.burst) {
          flake.vy += 0.12 * dt;
          flake.vx *= 0.985;
        } else {
          const fall = isRain ? 7 + flake.r * 1.5 : flake.vy * (isBlizzard ? 2.4 : 1);
          flake.vy += (fall - flake.vy) * 0.08;
          flake.phase += 0.02 * dt;
          flake.vx += ((isRain ? 1.2 : Math.sin(flake.phase) * flake.sway) + wind - flake.vx) * 0.05;
        }

        // Out of the cursor's way, and a little of its momentum along with it.
        const dx = flake.x - pointer.x;
        const dy = flake.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < REPEL_RADIUS && distance > 0.1 && Date.now() - pointer.at < 1500) {
          const force = (1 - distance / REPEL_RADIUS) * 1.4;
          flake.vx += (dx / distance) * force + pointer.vx * 0.04;
          flake.vy += (dy / distance) * force * 0.6 + pointer.vy * 0.03;
        }

        flake.x += flake.vx * dt;
        flake.y += flake.vy * dt;

        if (flake.y > height + 20 || flake.x < -40 || flake.x > width + 40) {
          if (flake.burst) {
            flake.burst = false;
            flake.active = false;
          }
          Object.assign(flake, makeFlake(width, height, false), {r: flake.r, burst: false, active: flake.active});
        }

        values[index].setValue({x: flake.x, y: flake.y});
      });
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [values, radii]);

  // A handful of flakes thrown from a point: a festive message, a drift
  // knocked off a card. Taken from the parked end of the pool.
  useEffect(
    () =>
      onEffect(effect => {
        if (effect.type !== 'burst' || !flakes.current) return;
        const {width, height} = sizeRef.current;
        const x = effect.x ?? width / 2;
        const y = effect.y ?? height * 0.75;
        let remaining = effect.count ?? 60;

        for (let i = flakes.current.length - 1; i >= 0 && remaining > 0; i--) {
          const flake = flakes.current[i];
          if (flake.active) continue;
          const angle = effect.spread === 'down' ? Math.PI / 2 + (Math.random() - 0.5) * 1.6 : -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
          const speed = (effect.power ?? 9) * (0.4 + Math.random() * 0.8);
          Object.assign(flake, {x: x + (Math.random() - 0.5) * (effect.width ?? 20), y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, burst: true, active: true, parked: false});
          remaining -= 1;
        }
      }),
    [],
  );

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={event => setSize({width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height})}>
      {values.map((value, index) => {
        const r = radii[index];
        return (
          <Animated.View
            key={index}
            style={[
              rain ? styles.drop : styles.flake,
              rain ? {height: 10 + r * 3} : {width: r * 2, height: r * 2, borderRadius: r, opacity: 0.55 + r / 9},
              {transform: [...value.getTranslateTransform(), ...(rain ? [{rotate: '-8deg'}] : [])]},
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flake: {
    position: 'absolute',
    left: 0,
    top: 0,
    // No shadow glow: a CALayer shadow on 150 moving views costs more than
    // the whole simulation.
    // A faint edge keeps white flakes visible against the light theme.
    backgroundColor: 'white',
    borderWidth: 0.5,
    borderColor: 'rgba(120, 145, 180, 0.45)',
  },
  drop: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(190, 210, 255, 0.55)',
  },
});
