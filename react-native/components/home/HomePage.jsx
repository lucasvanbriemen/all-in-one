import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {Notification} from './Notification';
import {NowPlayingCard} from '../music/NowPlayingCard';
import {OverviewCard} from '../money/OverviewCard';
import {Reminder} from './Reminder';
import {ReminderForm} from './ReminderForm';
import {Stat} from './Stat';
import {api} from '../api';
import {greeting} from './greeting';
import {useCompactLayout} from '../useCompactLayout';

export function HomePage() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const [serverData, setServerData] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [reminders, setReminders] = useState(null);

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
          <Stat key={index} value={data.value} label={data.label} attentionLevel={data.importance_level}/>
        ))}
      </View>

      <Text style={styles.greeting}>{greeting.generateGreeting()}</Text>

      <View style={[styles.mainContent, compact && styles.compactMain]}>
        <View style={compact ? undefined : styles.notificationsContainer}>
          <ScrollView>
            {notifications && notifications.map((notification, index) => (
              <Notification key={index} notification={notification} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.nowPlaying}>
          <NowPlayingCard />
        </View>

        <View style={styles.reminders}>
          <Text style={styles.cardTitle}>Reminders</Text>
          <ScrollView style={styles.reminderList}>
            {reminders && reminders.length === 0 && (
              <Text style={styles.empty}>Nothing to remind you of right now.</Text>
            )}
            {reminders && reminders.map(reminder => (
              <Reminder
                key={reminder.id}
                reminder={reminder}
                onComplete={done => setReminders(current => current.filter(r => r.id !== done.id))}
              />
            ))}
          </ScrollView>
          <ReminderForm onCreate={created => {
            setReminders(current => [...(current || []), created]);
          }} />
        </View>
        <OverviewCard />
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  compactStats: { flexWrap: 'wrap', gap: 8 },
  compactMain: { flex: 0, flexDirection: 'column', gap: 16 },
  notificationsContainer: {
    flex: 2,
  },
  nowPlaying: {
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
