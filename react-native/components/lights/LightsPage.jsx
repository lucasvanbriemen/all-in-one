import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {BrightnessSlider} from './BrightnessSlider';
import {ColorWheel} from './ColorWheel';
import {hsvToHex} from './color';
import {useBottomInset} from '../useCompactLayout';
import {api} from '../api';
import { useApi } from '../useApi';
import {glass, useThemedStyles} from '../theme';

const MAX_WHEEL = 320;

export function LightsPage() {
  const bottomInset = useBottomInset();
  const styles = useThemedStyles(createStyles);
  const [cardWidth, setCardWidth] = useState(0);
  // Off while dragging the wheel or slider, or the page scrolls along.
  const [dragging, setDragging] = useState(false);
  const [light, setLight] = useState({hue: 40, saturation: 0.4, brightness: 80});

  const lightMetadata = useApi("/lights");

  const color = hsvToHex(light.hue, light.saturation);
  const wheelSize = Math.min(cardWidth - 32, MAX_WHEEL);

  const update = changes => setLight(current => ({...current, ...changes}));

  // Called once a drag ends, so the lamp isn't flooded with requests.
  const commit = changes => {
    const next = {...light, ...changes};
    setLight(next);
    api.post("/lights/change", {
      hex: hsvToHex(next.hue, next.saturation),
      brightness: next.brightness,
    });
  };

  return (
    <ScrollView scrollEnabled={!dragging} contentContainerStyle={[styles.content, {paddingBottom: bottomInset + 16}]}>
      <Text>Scenes:</Text>
      {lightMetadata.data?.scenes?.map(scene => (
        <Pressable key={scene.name} onPress={() => api.post("/lights/apply_scene", { scene: scene.name })}>
          <Text key={scene.name}>{scene.name}</Text>
        </Pressable>
      ))}

      <View style={styles.card} onLayout={event => setCardWidth(event.nativeEvent.layout.width)}>
        <View style={styles.header}>
          <View style={[styles.swatch, {backgroundColor: color, opacity: 0.2 + 0.8 * (light.brightness / 100)}]} />
          <Text style={styles.title}>Colour</Text>
          <Text style={styles.caption}>{color.toUpperCase()}</Text>
        </View>

        {wheelSize > 0 ? (
          <View style={styles.wheel}>
            <ColorWheel
              size={wheelSize}
              hue={light.hue}
              saturation={light.saturation}
              onChange={update}
              onChangeEnd={commit}
              onDragStart={() => setDragging(true)}
              onDragEnd={() => setDragging(false)}
            />
          </View>
        ) : null}

        <View style={styles.header}>
          <Text style={styles.title}>Brightness</Text>
          <Text style={styles.caption}>{light.brightness}%</Text>
        </View>

        <BrightnessSlider
          value={light.brightness}
          color={color}
          onChange={brightness => update({brightness})}
          onChangeEnd={brightness => commit({brightness})}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => setDragging(false)}
        />
      </View>
    </ScrollView>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    paddingTop: 16,
    alignItems: 'center',
  },
  card: {
    ...glass(colors),
    width: '100%',
    maxWidth: 420,
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  title: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  caption: {
    color: colors.outline,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  wheel: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
