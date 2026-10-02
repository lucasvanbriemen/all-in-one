import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { glass, useThemedStyles } from '../theme';

import {api} from '../api';
import { useCompactLayout } from '../useCompactLayout';
import { useEffect } from 'react';

export function WeatherCard() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);

  const [weather, setWeather] = useState([]);

  useEffect(() => {
    api.get('/weather').then(response => setWeather(response));
  }, []);

  return (
    <View style={[styles.content]}>
      <View style={styles.row}>
        <Text style={styles.feels_like}>Feels like {weather.feels_like}</Text>
        <View style={styles.row}>
          <Text style={styles.minmax}>Min: {weather.min}</Text>
          <Text style={styles.minmax}>Max: {weather.max}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.minmax}>Humidity: {weather.humidity}</Text>
        <Text style={styles.minmax}>Condition: {weather.condition}</Text>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    padding: 16,
    ...glass(colors),
    borderRadius: 8,
    marginVertical: 16,
  },

  feels_like: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  minmax: {
    color: colors.secondary,
  },
});
