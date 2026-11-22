import React, {useEffect, useId, useRef, useState} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Defs, RadialGradient, Rect, Stop} from 'react-native-svg';

import {BrightnessSlider} from './BrightnessSlider';
import {ColorWheel} from './ColorWheel';
import {WhiteWheel, isWhitish} from './WhiteWheel';
import {MAX_LEVEL, hsvToHex, levelToPercent, svgId} from './color';
import {glass, useThemedStyles, withAlpha} from '../theme';

const MAX_WHEEL = 340;
// Wider than this, the wheel sits beside the lamp list instead of above it.
const SIDE_BY_SIDE = 700;

// All lamps on one wheel, Hue style, with a row per lamp for power and brightness.
// `lights` is [{id, name, reachable, state: {hue, saturation, brightness, on}}].
export function LightsPanel({lights, selectedId, onSelect, onChange, onPowerToggle, onDraggingChange}) {
  const styles = useThemedStyles(createStyles);
  const [size, setSize] = useState({width: 0, height: 0});
  const [mode, setMode] = useState(() => (lights.length && lights.every(l => isWhitish(l.state)) ? 'white' : 'colour'));

  const sideBySide = size.width >= SIDE_BY_SIDE;
  const wheelSize = Math.min(sideBySide ? size.width * 0.45 : size.width - 48, MAX_WHEEL);

  const dragStart = () => onDraggingChange(true);
  const dragEnd = () => onDraggingChange(false);

  // The white wheel can only show lamps that are some kind of white; a coloured
  // lamp appears there as soon as it's moved onto the wheel.
  const markers = lights
    .filter(light => mode === 'colour' || isWhitish(light.state))
    .map(light => ({id: light.id, label: light.name.charAt(0), ...light.state}));

  const Wheel = mode === 'white' ? WhiteWheel : ColorWheel;

  return (
    <View
      style={styles.card}
      onLayout={event => {
        const {width, height} = event.nativeEvent.layout;
        setSize({width, height});
      }}>
      {size.width > 0 ? <Glow lights={lights} width={size.width} height={size.height} /> : null}

      <View style={[styles.body, sideBySide && styles.bodySideBySide]}>
        <View style={styles.wheelColumn}>
          <View style={styles.modes}>
            {[['colour', 'Colour'], ['white', 'White']].map(([key, label]) => (
              <Pressable key={key} onPress={() => setMode(key)} style={[styles.mode, mode === key && styles.modeActive]}>
                <Text style={[styles.modeText, mode === key && styles.modeTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {wheelSize > 0 ? (
            <Wheel
              size={wheelSize}
              markers={markers}
              selectedId={selectedId}
              onSelect={onSelect}
              onChange={(id, colour) => onChange(id, colour)}
              onChangeEnd={(id, colour) => onChange(id, colour, {final: true})}
              onDragStart={dragStart}
              onDragEnd={dragEnd}
            />
          ) : null}
        </View>

        <View style={[styles.list, sideBySide && styles.listSideBySide]}>
          {lights.map(light => (
            <LightRow
              key={light.id}
              light={light}
              selected={light.id === selectedId}
              onSelect={() => onSelect(light.id)}
              onChange={(changes, options) => onChange(light.id, changes, options)}
              onPowerToggle={() => onPowerToggle(light.id)}
              onDragStart={() => {
                onSelect(light.id);
                dragStart();
              }}
              onDragEnd={dragEnd}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// Each lamp's light spilling into the card from the top, side by side.
// Sized to the measured card: macOS ignores percentage sizes on <Svg>.
function Glow({lights, width, height}) {
  const baseId = svgId(useId());

  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      <Defs>
        {lights.map((light, index) => {
          const {hue, saturation, brightness, on} = light.state;
          const intensity = on ? 0.35 + 0.65 * (brightness / MAX_LEVEL) : 0;
          const color = hsvToHex(hue, saturation);
          return (
            <RadialGradient
              key={light.id}
              id={`${baseId}${index}`}
              cx={`${((index + 0.5) / lights.length) * 100}%`}
              cy="0%"
              rx={`${90 / Math.sqrt(lights.length)}%`}
              ry="75%"
              fx={`${((index + 0.5) / lights.length) * 100}%`}
              fy="0%">
              <Stop offset="0" stopColor={color} stopOpacity={0.38 * intensity} />
              <Stop offset="0.55" stopColor={color} stopOpacity={0.1 * intensity} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          );
        })}
      </Defs>
      {lights.map((light, index) => (
        <Rect key={light.id} x={0} y={0} width={width} height={height} fill={`url(#${baseId}${index})`} />
      ))}
    </Svg>
  );
}

function LightRow({light, selected, onSelect, onChange, onPowerToggle, onDragStart, onDragEnd}) {
  const styles = useThemedStyles(createStyles);
  const {state} = light;
  const color = hsvToHex(state.hue, state.saturation);

  let subtitle = `${levelToPercent(state.brightness)}%`;
  if (!state.on) subtitle = 'Off';
  if (!light.reachable) subtitle = 'Not reachable';

  return (
    <Pressable onPress={onSelect} style={[styles.row, selected && styles.rowSelected]}>
      <View style={styles.rowHeader}>
        <View style={[styles.dot, {backgroundColor: color, opacity: state.on ? 1 : 0.4}]}>
          <Text style={styles.dotLabel}>{light.name.charAt(0)}</Text>
        </View>
        <View style={styles.rowText}>
          <Text style={styles.name} numberOfLines={1}>{light.name}</Text>
          <Text style={[styles.subtitle, !light.reachable && styles.warning]}>{subtitle}</Text>
        </View>
        <PowerSwitch on={state.on} color={color} onToggle={onPowerToggle} />
      </View>

      <View style={!state.on && styles.dimmed}>
        <BrightnessSlider
          value={state.brightness}
          hue={state.hue}
          saturation={state.saturation}
          onChange={brightness => onChange({brightness})}
          onChangeEnd={brightness => onChange({brightness}, {final: true})}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      </View>
    </Pressable>
  );
}

function PowerSwitch({on, color, onToggle}) {
  const styles = useThemedStyles(createStyles);
  const position = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(position, {toValue: on ? 1 : 0, useNativeDriver: false, bounciness: 6, speed: 18}).start();
  }, [on, position]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{checked: on}}
      onPress={onToggle}
      hitSlop={8}
      style={[styles.switchTrack, on && {backgroundColor: color, borderColor: color}]}>
      <Animated.View
        style={[
          styles.switchThumb,
          {transform: [{translateX: position.interpolate({inputRange: [0, 1], outputRange: [0, 20]})}]},
        ]}
      />
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  card: {
    ...glass(colors),
    padding: 20,
    borderRadius: 22,
    overflow: 'hidden',
  },
  body: {
    gap: 20,
  },
  bodySideBySide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  wheelColumn: {
    alignItems: 'center',
    gap: 16,
  },
  list: {
    gap: 8,
  },
  listSideBySide: {
    flex: 1,
  },
  modes: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    backgroundColor: withAlpha(colors.onSurface, 0.07),
  },
  mode: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modeActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
  },
  modeText: {
    color: colors.outline,
    fontSize: 13,
    fontWeight: '600',
  },
  modeTextActive: {
    color: colors.onSurface,
  },
  row: {
    padding: 12,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowSelected: {
    backgroundColor: withAlpha(colors.onSurface, 0.05),
    borderColor: withAlpha(colors.onSurface, 0.08),
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
  },
  dotLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowRadius: 2,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  name: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.outline,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  warning: {
    color: colors.error ?? colors.outline,
  },
  dimmed: {
    opacity: 0.45,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: withAlpha(colors.onSurface, 0.12),
    backgroundColor: withAlpha(colors.onSurface, 0.12),
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
  },
});
