import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {Reminder} from './Reminder';
import {ReminderForm} from './ReminderForm';
import {SnowCap} from '../seasonal/SnowCap';
import { useApi } from "../useApi";

export function ReminderCard() {
  const styles = useThemedStyles(createStyles);
  const reminders = useApi('/reminders').data;

  return (
    <View style={styles.reminders}>
      <SnowCap />
      <Text style={styles.cardTitle}>Reminders</Text>
      <ScrollView style={styles.reminderList}>
        {reminders && reminders.length === 0 && (
          <Text style={styles.empty}>Nothing to remind you of right now.</Text>
        )}
        {reminders && reminders.map(reminder => (
          <Reminder key={reminder.id} reminder={reminder} onComplete={done => {}}/>
        ))}
      </ScrollView>
      <ReminderForm onCreate={created => {}} />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  seasonalRow: {
    flexDirection: 'row',
    gap: 16,
  },
  seasonalRowCompact: {flexDirection: 'column'},
  compactStats: { flexWrap: 'wrap', gap: 8 },
  compactMain: { flex: 0, flexDirection: 'column', gap: 16 },
  notificationsContainer: {
    flex: 2,
  },
  itemRow: {
    flex: 1,
    gap: 16,
  },
  content: {
    flex: 1,
    gap: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
    color: colors.onSurface
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
    flexDirection: 'row',
    gap: 16,
  },
});
