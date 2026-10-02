import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { glass, useTheme, useThemedStyles } from '../theme';

import { ChevronDown } from '../icons/chevronDown';
import { ChevronTop } from '../icons/chevronTop';
import { WeatherIcon } from '../icons';
import { api } from '../api';

export function WeatherCard() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();

  const [weather, setWeather] = useState({});

  useEffect(() => {
    api.get('/weather').then(response => setWeather(response));
  }, []);

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <WeatherIcon condition={weather.condition} size={40} color={colors.primary} />
        <View>
          <Text style={styles.temperature}>{weather.feels_like}</Text>
          <Text style={styles.subtle}>{weather.condition}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.stat}>
          <ChevronDown size={14} color={colors.secondary} />
          <Text style={styles.subtle}>{weather.min}</Text>
        </View>
        <View style={styles.stat}>
          <ChevronTop size={14} color={colors.secondary} />
          <Text style={styles.subtle}>{weather.max}</Text>
        </View>
        <View style={styles.stat}>
          <WeatherIcon condition="Drizzle" size={14} color={colors.secondary} />
          <Text style={styles.subtle}>{weather.humidity}</Text>
        </View>
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
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  temperature: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtle: {
    color: colors.secondary,
  },
});
