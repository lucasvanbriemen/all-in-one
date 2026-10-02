import {StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import {api} from '../api';

const SNOW = [71, 73, 75, 77, 85, 86];
const STORM = [95, 96, 99];
const RAIN = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];

function iconFor(code, isDay) {
  if (STORM.includes(code)) return 'storm';
  if (SNOW.includes(code)) return 'snow';
  if (RAIN.includes(code)) return 'rain';
  if (code >= 2) return 'cloud';
  return isDay ? 'sun' : 'moon';
}

export function WeatherCard() {
  const styles = useThemedStyles(createStyles);
  const [weather, setWeather] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.get('/weather').then(setWeather).catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weather</Text>
        <Text style={styles.empty}>Weather is unavailable right now.</Text>
      </View>
    );
  }

  if (!weather) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weather</Text>
      </View>
    );
  }

  const {current, today, outfit} = weather;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.now}>
          <Icon name={iconFor(current.weather_code, current.is_day)} size={40} color={styles.icon.color} />
          <View>
            <Text style={styles.temperature}>{Math.round(current.temperature)}°</Text>
            <Text style={styles.condition}>{current.condition}</Text>
          </View>
        </View>
        <View style={styles.range}>
          <Text style={styles.meta}>↑ {Math.round(today.temperature_max)}°  ↓ {Math.round(today.temperature_min)}°</Text>
          <Text style={styles.meta}>Feels like {Math.round(current.feels_like)}°</Text>
          <Text style={styles.meta}>Rain {today.rain_chance ?? 0}% · Wind {Math.round(current.wind_speed)} km/h</Text>
        </View>
      </View>

      <Text style={styles.headline}>{outfit.headline}</Text>
      <View style={styles.chips}>
        {outfit.items.map(item => (
          <View key={item} style={styles.chip}>
            <Text style={styles.chipText}>{item}</Text>
          </View>
        ))}
      </View>
      {outfit.notes.map(note => (
        <Text key={note} style={styles.note}>{note}</Text>
      ))}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  card: {...glass(colors), padding: 16, borderRadius: 16, gap: 8},
  cardTitle: {fontSize: 18, fontWeight: 'bold', color: colors.onSurface},
  empty: {fontSize: 14, color: colors.onSurfaceVariant},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12},
  now: {flexDirection: 'row', alignItems: 'center', gap: 12},
  icon: {color: colors.primary},
  temperature: {fontSize: 32, fontWeight: 'bold', color: colors.onSurface},
  condition: {fontSize: 14, color: colors.onSurfaceVariant},
  range: {alignItems: 'flex-end', gap: 2},
  meta: {fontSize: 12, color: colors.outline},
  headline: {fontSize: 16, fontWeight: 'bold', color: colors.onSurface, marginTop: 4},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  chip: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, backgroundColor: colors.primary},
  chipText: {fontSize: 12, color: colors.onPrimary},
  note: {fontSize: 12, color: colors.onSurfaceVariant},
});
