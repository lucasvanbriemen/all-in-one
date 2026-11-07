import React, {useEffect, useMemo, useState} from 'react';
import { StyleSheet, Text, View} from 'react-native';
import { useThemedStyles} from '../theme';

import {NewYearCountdown} from '../seasonal/Countdowns';
import {useSeason} from '../seasonal/useSeason';
import {describeWeather} from '../seasonal/data';
import { useApi } from "../useApi";
import {greeting} from './greeting';

export function Greeting() {
  const styles = useThemedStyles(createStyles);
  const season = useSeason();
  const currentWeather = useApi('/weather').data;

  const date = new Date();

  const greetingText = greeting.generateGreeting({...season, weather: describeWeather(currentWeather).kind});

  return (
    <View>
      {season.decorated && season.phase === 'nye' ? (
        <NewYearCountdown />
      ) : (
        <View style={styles.content}>
          <Text style={styles.date}>{date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · {currentWeather?.feels_like} {currentWeather?.condition}</Text>
          <Text style={styles.greeting}>{greetingText}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    paddingTop: 16,
    gap: 8,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.onSurface
  },
  date: {
    fontSize: 14,
    color: colors.outline
  }
});
