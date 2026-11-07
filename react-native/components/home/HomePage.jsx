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
import {api} from '../api';
import {greeting} from './greeting';
import {useCompactLayout} from '../useCompactLayout';

export function HomePage() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const [serverData, setServerData] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [reminders, setReminders] = useState(null);
  const season = useSeason();
  const weather = useWeather();

  // Rolled once per hour (and when the weather or season changes) rather than
  // on every render, so the minute tick of the countdown doesn't re-roll it.
  const hour = season.date.getHours();
  const greetingText = useMemo(
    () => greeting.generateGreeting({...season, weather: weather.kind}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [season.phase, season.decorated, weather.kind, hour],
  );

  useEffect(() => {
    api.get('/server_data').then(response => {
      setServerData(response);
    });

    api.get('/notifications').then(response => {
      setNotifications(response);
    });

    api.get('/reminders').then(response => {
      setReminders(response);
    });
  }, []);

  return (
    <View style={styles.content}>
      <View style={[styles.statsContainer, compact && styles.compactStats]}>
        {serverData && serverData.map((data, index) => (
          <Stat key={index} value={data.value} label={grinchLabel(season, data)} attentionLevel={data.importance_level}/>
        ))}
        <CountdownStat />
      </View>

      {season.decorated && season.phase === 'nye' ? (
        <NewYearCountdown />
      ) : (
        <Text style={styles.greeting}>{greetingText}</Text>
      )}

      {season.decorated && (season.phase === 'advent' || season.phase === 'christmas') && (
        <View style={[styles.seasonalRow, compact && styles.seasonalRowCompact]}>
          <AdventCalendar />
          <ChristmasTreeCard />
          <NaughtyNiceCard />
        </View>
      )}

      <View style={[styles.mainContent, compact && styles.compactMain]}>
        <View style={compact ? undefined : styles.notificationsContainer}>
          <ScrollView>
            {notifications && notifications.map((notification, index) => (
              <Notification key={index} notification={notification} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.itemRow}>
          <NowPlayingCard />
          <WeatherCard />
        </View>

        <View style={styles.reminders}>
          <SnowCap />
          <Text style={styles.cardTitle}>Reminders</Text>
          <ScrollView style={styles.reminderList}>
            {reminders && reminders.length === 0 && (
              <Text style={styles.empty}>Nothing to remind you of right now.</Text>
            )}
            {reminders && reminders.map(reminder => (
              <Reminder key={reminder.id} reminder={reminder} onComplete={done => setReminders(current => current.filter(r => r.id !== done.id))}/>
            ))}
          </ScrollView>
          <ReminderForm onCreate={created => {
            setReminders(current => [...(current || []), created]);
          }} />
        </View>
        <View style={styles.moneyColumn}>
          <OverviewCard />
          <UncategorizedTransactions />
        </View>
      </View>
    </View>
  );
}

/** A server stat in trouble, during the season, is the Grinch's doing. */
function grinchLabel(season, data) {
  if (!season.decorated || data.importance_level !== 'high') return data.label;
  return `🟢 The Grinch stole your ${String(data.label).toLowerCase()}`;
}

const createStyles = colors => StyleSheet.create({
  seasonalRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    height: 196,
  },
  seasonalRowCompact: {flexDirection: 'column', height: undefined},
  compactStats: { flexWrap: 'wrap', gap: 8 },
  compactMain: { flex: 0, flexDirection: 'column', gap: 16 },
  notificationsContainer: {
    flex: 2,
  },
  itemRow: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
    color: colors.outline
  },
  reminders: {
    flex: 1,
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
  },
  reminderList: {flex: 1},
  moneyColumn: {
    flex: 1,
    gap: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.onSurface,
  },
  empty: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  mainContent: {
    flex: 1,
    marginTop: 16,
    flexDirection: 'row',
    gap: 32,
  },
});
