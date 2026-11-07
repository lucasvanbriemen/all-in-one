import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {Notification} from './Notification';
import {NowPlayingCard} from '../music/NowPlayingCard';
import {OverviewCard} from '../money/OverviewCard';
import {Reminder} from './Reminder';
import {ReminderForm} from './ReminderForm';
import {Stat} from './Stat';
import {UncategorizedTransactions} from '../money/UncategorizedTransactions';
import {AdventCalendar} from '../seasonal/AdventCalendar';
import {ChristmasTreeCard} from '../seasonal/ChristmasTree';
import {CountdownStat, NewYearCountdown} from '../seasonal/Countdowns';
import {NaughtyNiceCard} from '../seasonal/NaughtyNice';
import {SnowCap} from '../seasonal/SnowCap';
import {useSeason} from '../seasonal/useSeason';
import {useWeather} from '../seasonal/data';
import {WeatherCard} from './WeatherCard';
import { useApi } from "../useApi";
import {greeting} from './greeting';
import {useCompactLayout} from '../useCompactLayout';

export function Greeting() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const serverData = useApi('/server_data').data;
  const notifications = useApi('/notifications').data;
  const reminders = useApi('/reminders').data;
  const season = useSeason();
  const weather = useWeather();
  const currentWeather = useApi('/weather').data;

  // Rolled once per hour (and when the weather or season changes) rather than
  // on every render, so the minute tick of the countdown doesn't re-roll it.
  const hour = season.date.getHours();
  const greetingText = useMemo(
    () => greeting.generateGreeting({...season, weather: weather.kind}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [season.phase, season.decorated, weather.kind, hour],
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
