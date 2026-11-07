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

  // Rolled once per hour (and when the weather or season changes) rather than
  // on every render, so the minute tick of the countdown doesn't re-roll it.
  const hour = season.date.getHours();
  const greetingText = useMemo(
    () => greeting.generateGreeting({...season, weather: weatherForGreeting.kind}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [season.phase, season.decorated, weatherForGreeting.kind, hour],
  );

  return (
    <View style={styles.content}>
      {season.decorated && season.phase === 'nye' ? (
        <NewYearCountdown />
      ) : (
        <>
          <Text>{season.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
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
