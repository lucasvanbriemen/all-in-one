import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {Reminder} from './Reminder';
import {ReminderForm} from './ReminderForm';
import {SnowCap} from '../seasonal/SnowCap';
import { useApi } from "../useApi";

export function ReminderCard() {
  const styles = useThemedStyles(createStyles);
  const {data, refresh} = useApi('/reminders');
  const reminders = data || [];

  return (
    <View style={styles.reminders}>
      <SnowCap />
      <Text style={styles.title}>Reminders</Text>
      <ScrollView style={styles.reminderList}>
        {reminders && reminders.length === 0 && (
          <Text style={styles.noReminders}>Nothing to remind you of right now.</Text>
        )}
        {reminders && reminders.map(reminder => (
          <Reminder key={reminder.id} reminder={reminder} onComplete={refresh()}/>
        ))}
      </ScrollView>
      <ReminderForm onCreate={created => {}} />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  reminders: {
    flex: 0,
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.onSurface,
  },
  noReminders: {
    fontStyle: 'italic',
    color: colors.onSurfaceVariant,
  }
});
