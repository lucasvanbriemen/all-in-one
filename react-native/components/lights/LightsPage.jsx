import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {LightCard} from './LightCard';
import {hexToHsv, hsvToHex} from './color';
import {useBottomInset} from '../useCompactLayout';
import {api} from '../api';
import {useApi} from '../useApi';
import {glass, useThemedStyles, withAlpha} from '../theme';

// While dragging, the lamp follows along at most this often. The bridge
// coalesces queued changes per lamp, so it never falls behind.
const LIVE_INTERVAL_MS = 180;

const FALLBACK = {hue: 36, saturation: 0.5, brightness: 200, on: true};

const fromStatus = status => ({
  ...FALLBACK,
  ...(hexToHsv(status.hex) ?? {}),
  // Turning off drops the level to its minimum, so don't come back on at 1%.
  brightness: status.on && status.brightness > 1 ? status.brightness : FALLBACK.brightness,
  on: !!status.on,
});

export function LightsPage() {
  const bottomInset = useBottomInset();
  const styles = useThemedStyles(createStyles);
  const {data} = useApi('/lights');

  // An older cached response had `lights` as an object; only trust the array shape.
  const lights = Array.isArray(data?.lights) ? data.lights : [];
  const scenes = data?.scenes ?? [];

  // Off while dragging a wheel or slider, or the page scrolls along.
  const [dragging, setDragging] = useState(false);
  const [states, setStates] = useState({});
  const [activeScene, setActiveScene] = useState(null);
  // Lamps the user has touched this session; a late status response won't overwrite them.
  const touched = useRef(new Set());
  const send = useLiveSender();

  // Start each card from what the lamp is actually showing.
  useEffect(() => {
    setStates(current => {
      const next = {...current};
      lights.forEach(light => {
        if (touched.current.has(light.id)) return;
        next[light.id] = light.status ? fromStatus(light.status) : current[light.id] ?? FALLBACK;
      });
      return next;
    });
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const stateOf = id => states[id] ?? FALLBACK;

  const changeLight = (id, changes, {final = false} = {}) => {
    touched.current.add(id);
    setActiveScene(null);
    // Any colour or brightness change also turns the lamp on.
    const next = {...stateOf(id), ...changes, on: true};
    setStates(current => ({...current, [id]: next}));
    send(id, {hex: hsvToHex(next.hue, next.saturation), brightness: next.brightness}, final);
  };

  const togglePower = id => {
    const current = stateOf(id);
    if (current.on) {
      touched.current.add(id);
      setActiveScene(null);
      setStates(all => ({...all, [id]: {...current, on: false}}));
      send(id, {on: false, hex: hsvToHex(current.hue, current.saturation)}, true);
    } else {
      changeLight(id, {}, {final: true});
    }
  };

  const anyOn = lights.some(light => stateOf(light.id).on);
  const onCount = lights.filter(light => stateOf(light.id).on).length;

  const toggleAll = () => {
    lights.forEach(light => {
      if (anyOn ? stateOf(light.id).on : true) togglePower(light.id);
    });
  };

  const applyScene = scene => {
    setActiveScene(scene.name);
    api.post('/lights/scenes', {scene: scene.name});
    setStates(current => {
      const next = {...current};
      lights.forEach(light => {
        const settings = scene.lights?.[light.slug];
        if (!settings) return;
        touched.current.add(light.id);
        next[light.id] = {...(hexToHsv(settings.hex) ?? FALLBACK), brightness: settings.brightness, on: true};
      });
      return next;
    });
  };

  return (
    <ScrollView
      scrollEnabled={!dragging}
      contentContainerStyle={[styles.content, {paddingBottom: bottomInset + 24}]}>
      <View style={styles.inner}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderText}>
            <Text style={styles.pageTitle}>Lights</Text>
            {lights.length > 0 ? (
              <Text style={styles.pageSubtitle}>
                {onCount === 0 ? 'All off' : `${onCount} of ${lights.length} on`}
              </Text>
            ) : null}
          </View>
          {lights.length > 0 ? (
            <Pressable onPress={toggleAll} style={({pressed}) => [styles.allButton, pressed && styles.pressed]}>
              <Text style={styles.allButtonText}>{anyOn ? 'All off' : 'All on'}</Text>
            </Pressable>
          ) : null}
        </View>

        {scenes.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scenes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scenes}>
              {scenes.map(scene => (
                <SceneChip
                  key={scene.name}
                  scene={scene}
                  active={activeScene === scene.name}
                  onPress={() => applyScene(scene)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.grid}>
          {lights.map(light => (
            <LightCard
              key={light.id}
              name={light.name}
              light={stateOf(light.id)}
              reachable={!!light.status}
              onChange={(changes, options) => changeLight(light.id, changes, options)}
              onPowerToggle={() => togglePower(light.id)}
              onDraggingChange={setDragging}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function SceneChip({scene, active, onPress}) {
  const styles = useThemedStyles(createStyles);
  const colors = Object.values(scene.lights ?? {}).map(settings => settings.hex);

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
      <View style={styles.chipDots}>
        {colors.map((hex, index) => (
          <View
            key={`${hex}-${index}`}
            style={[styles.chipDot, {backgroundColor: hex, marginLeft: index === 0 ? 0 : -7, zIndex: colors.length - index}]}
          />
        ))}
      </View>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{scene.name}</Text>
    </Pressable>
  );
}

// Sends lamp changes, throttled per lamp while dragging; `final` sends right away.
function useLiveSender() {
  const lamps = useRef({}); // id -> {last, timer, pending}

  useEffect(() => () => Object.values(lamps.current).forEach(lamp => clearTimeout(lamp.timer)), []);

  return useCallback((id, payload, final) => {
    const lamp = (lamps.current[id] ??= {last: 0, timer: null, pending: null});
    lamp.pending = payload;

    const flush = () => {
      clearTimeout(lamp.timer);
      lamp.timer = null;
      if (!lamp.pending) return;
      api.post('/lights/change', {id, ...lamp.pending});
      lamp.pending = null;
      lamp.last = Date.now();
    };

    const wait = LIVE_INTERVAL_MS - (Date.now() - lamp.last);
    if (final || wait <= 0) flush();
    else if (!lamp.timer) lamp.timer = setTimeout(flush, wait);
  }, []);
}

const createStyles = colors => StyleSheet.create({
  content: {
    paddingTop: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: 920,
    gap: 22,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageHeaderText: {
    flex: 1,
    gap: 2,
  },
  pageTitle: {
    color: colors.onSurface,
    fontSize: 28,
    fontWeight: '700',
  },
  pageSubtitle: {
    color: colors.outline,
    fontSize: 14,
  },
  allButton: {
    ...glass(colors, {variant: 'subtle'}),
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  allButtonText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.outline,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  scenes: {
    gap: 10,
  },
  chip: {
    ...glass(colors),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 10,
    paddingRight: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: withAlpha(colors.primary, 0.16),
  },
  chipDots: {
    flexDirection: 'row',
  },
  chipDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: withAlpha(colors.surface, 0.9),
  },
  chipText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.primary,
  },
  pressed: {
    opacity: 0.7,
    transform: [{scale: 0.97}],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
});
