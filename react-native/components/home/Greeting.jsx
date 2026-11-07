import React, {useEffect, useMemo, useState} from 'react';
import { StyleSheet, Text, View} from 'react-native';
import { useThemedStyles} from '../theme';

import {NewYearCountdown} from '../seasonal/Countdowns';
import {useSeason} from '../seasonal/useSeason';
import {useWeather} from '../seasonal/data';
import { useApi } from "../useApi";
import {greeting} from './greeting';

export function Greeting() {
  const styles = useThemedStyles(createStyles);
  const season = useSeason();
  const weatherForGreeting = useWeather();
  const currentWeather = useApi('/weather').data;

  const date = new Date();

  const greetingText = greeting.generateGreeting({...season, weather: weatherForGreeting.kind});

  return (
    <View style={styles.content}>
      {season.decorated && season.phase === 'nye' ? (
        <NewYearCountdown />
      ) : (
        <>
          <Text>{date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <Text>{currentWeather?.feels_like} {currentWeather?.condition}</Text>
          <Text style={styles.greeting}>{greetingText}</Text>
        </>
      )}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
    color: colors.onSurface
  },
});
