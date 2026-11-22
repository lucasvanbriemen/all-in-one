import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {LightsPanel} from './LightsPanel';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';

import {hexToHsv, hsvToHex, svgId} from './color';
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
  const [selectedId, setSelectedId] = useState(null);
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
            <View style={styles.tiles}>
              {scenes.map(scene => (
                <SceneTile
                  key={scene.name}
                  scene={scene}
                  active={activeScene === scene.name}
                  onPress={() => applyScene(scene)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {lights.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lamps</Text>
            <LightsPanel
              lights={lights.map(light => ({...light, reachable: !!light.status, state: stateOf(light.id)}))}
              selectedId={selectedId ?? lights[0].id}
              onSelect={setSelectedId}
              onChange={changeLight}
              onPowerToggle={togglePower}
              onDraggingChange={setDragging}
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

// A big tile filled with the scene's colours, so you can see what you'll get.
function SceneTile({scene, active, onPress}) {
  const styles = useThemedStyles(createStyles);
  const gradientId = svgId(useId());
  const shadeId = svgId(useId());
  const [size, setSize] = useState({width: 0, height: 0});
  const sceneColors = Object.values(scene.lights ?? {}).map(settings => settings.hex);
  const stops = sceneColors.length > 1 ? sceneColors : [sceneColors[0] ?? '#888888', sceneColors[0] ?? '#888888'];
  const lampCount = sceneColors.length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      onLayout={event => {
        const {width, height} = event.nativeEvent.layout;
        setSize({width, height});
      }}
      style={({pressed}) => [styles.tile, active && styles.tileActive, pressed && styles.pressed]}>
      {/* Sized to the measured tile: macOS ignores percentage sizes on <Svg>. */}
      {size.width > 0 ? (
        <Svg style={StyleSheet.absoluteFill} width={size.width} height={size.height} pointerEvents="none">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              {stops.map((hex, index) => (
                <Stop key={index} offset={index / (stops.length - 1)} stopColor={hex} />
              ))}
            </LinearGradient>
            {/* Darkens the bottom so the white name stays readable on bright colours. */}
            <LinearGradient id={shadeId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.35" stopColor="#000000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.45} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${gradientId})`} />
          <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${shadeId})`} />
        </Svg>
      ) : null}

      {active ? (
        <View style={styles.tileCheck}>
          <Text style={styles.tileCheckMark}>✓</Text>
        </View>
      ) : null}

      <View style={styles.tileText}>
        <Text style={styles.tileName} numberOfLines={1}>{scene.name}</Text>
        <Text style={styles.tileMeta}>{lampCount === 1 ? '1 lamp' : `${lampCount} lamps`}</Text>
      </View>
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
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flexGrow: 1,
    flexBasis: 200,
    height: 112,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: withAlpha(colors.onSurface, 0.08),
  },
  tileActive: {
    borderColor: '#ffffff',
  },
  tileText: {
    gap: 1,
  },
  tileName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowRadius: 4,
    textShadowOffset: {width: 0, height: 1},
  },
  tileMeta: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '500',
  },
  tileCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCheckMark: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
    transform: [{scale: 0.97}],
  },
});
