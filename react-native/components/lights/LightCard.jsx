import React, {useEffect, useId, useRef, useState} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Defs, RadialGradient, Rect, Stop} from 'react-native-svg';

import {BrightnessSlider} from './BrightnessSlider';
import {ColorWheel} from './ColorWheel';
import {MAX_LEVEL, hsvToHex, levelToPercent, svgId} from './color';
import {glass, useThemedStyles, withAlpha} from '../theme';

const MAX_WHEEL = 280;

// Quick picks under the wheel, in lamp terms (hue 0-360, saturation 0-1).
const PRESETS = [
  {name: 'Candle', hue: 28, saturation: 0.8},
  {name: 'Warm', hue: 36, saturation: 0.5},
  {name: 'Soft', hue: 40, saturation: 0.22},
  {name: 'Cool', hue: 210, saturation: 0.15},
  {name: 'Red', hue: 0, saturation: 1},
  {name: 'Pink', hue: 325, saturation: 0.65},
  {name: 'Violet', hue: 270, saturation: 0.85},
  {name: 'Blue', hue: 222, saturation: 0.95},
  {name: 'Green', hue: 125, saturation: 0.85},
];

const isClose = (a, b) => {
  const hueGap = Math.abs(((a.hue - b.hue + 540) % 360) - 180);
  return Math.abs(a.saturation - b.saturation) < 0.04 && (hueGap < 4 || a.saturation < 0.03);
};

// One lamp: glow, power, colour wheel, presets and brightness.
// `light` is {hue, saturation, brightness, on}; `onChange(changes, {final})` updates it.
export function LightCard({name, light, reachable, onChange, onPowerToggle, onDraggingChange}) {
  const styles = useThemedStyles(createStyles);
  const glowId = svgId(useId());
  const [width, setWidth] = useState(0);

  const color = hsvToHex(light.hue, light.saturation);
  const level = light.brightness / MAX_LEVEL;
  // How strongly the lamp shines, for the glow and orb.
  const intensity = light.on ? 0.35 + 0.65 * level : 0;
  const wheelSize = Math.min(width - 48, MAX_WHEEL);

  const dragStart = () => onDraggingChange(true);
  const dragEnd = () => onDraggingChange(false);

  let subtitle = `${levelToPercent(light.brightness)}% · ${color.toUpperCase()}`;
  if (!light.on) subtitle = 'Off';
  if (!reachable) subtitle = 'Not reachable';

  return (
    <View style={styles.card} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {/* The lamp's light spilling into the card from the top. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <RadialGradient id={glowId} cx="50%" cy="0%" rx="85%" ry="70%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={color} stopOpacity={0.42 * intensity} />
            <Stop offset="0.55" stopColor={color} stopOpacity={0.12 * intensity} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${glowId})`} />
      </Svg>

      <View style={styles.header}>
        <View
          style={[
            styles.orb,
            {
              backgroundColor: light.on ? hsvToHex(light.hue, light.saturation, 0.45 + 0.55 * level) : withAlpha(color, 0.18),
              shadowColor: color,
              shadowOpacity: intensity,
            },
          ]}>
          <View style={[styles.orbShine, {opacity: light.on ? 0.55 : 0.15}]} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={[styles.subtitle, !reachable && styles.warning]}>{subtitle}</Text>
        </View>
        <PowerSwitch on={light.on} color={color} onToggle={onPowerToggle} />
      </View>

      <View style={[styles.controls, !light.on && styles.controlsOff]}>
        {wheelSize > 0 ? (
          <View style={styles.wheel}>
            <ColorWheel
              size={wheelSize}
              hue={light.hue}
              saturation={light.saturation}
              onChange={changes => onChange(changes)}
              onChangeEnd={changes => onChange(changes, {final: true})}
              onDragStart={dragStart}
              onDragEnd={dragEnd}
            />
          </View>
        ) : null}

        <View style={styles.presets}>
          {PRESETS.map(preset => {
            const selected = isClose(preset, light);
            return (
              <Pressable
                key={preset.name}
                accessibilityLabel={preset.name}
                onPress={() => onChange({hue: preset.hue, saturation: preset.saturation}, {final: true})}
                style={({pressed}) => [
                  styles.preset,
                  selected && {borderColor: hsvToHex(preset.hue, preset.saturation)},
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.presetFill, {backgroundColor: hsvToHex(preset.hue, preset.saturation)}]} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Brightness</Text>
          <Text style={styles.value}>{levelToPercent(light.brightness)}%</Text>
        </View>
        <BrightnessSlider
          value={light.brightness}
          hue={light.hue}
          saturation={light.saturation}
          onChange={brightness => onChange({brightness})}
          onChangeEnd={brightness => onChange({brightness}, {final: true})}
          onDragStart={dragStart}
          onDragEnd={dragEnd}
        />
      </View>
    </View>
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
    flexGrow: 1,
    flexBasis: 320,
    maxWidth: 440,
    padding: 20,
    borderRadius: 22,
    gap: 18,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  orb: {
    width: 42,
    height: 42,
    borderRadius: 21,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 0},
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  orbShine: {
    marginTop: 7,
    marginLeft: -10,
    width: 12,
    height: 8,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.onSurface,
    fontSize: 17,
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
  controls: {
    gap: 14,
  },
  controlsOff: {
    opacity: 0.45,
  },
  wheel: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  preset: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  presetFill: {
    flex: 1,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.onSurface, 0.15),
  },
  pressed: {
    transform: [{scale: 0.9}],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: -4,
  },
  label: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    color: colors.outline,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
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
