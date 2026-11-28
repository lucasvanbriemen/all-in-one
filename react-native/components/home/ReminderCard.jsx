import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {Reminder} from './Reminder';
import {ReminderForm} from './ReminderForm';
import {SnowCap} from '../seasonal/SnowCap';
import { useApi } from "../useApi";

export function ReminderCard() {
  const styles = createStyles();
  const {data, refresh} = useApi('/reminders');
  const reminders = Array.isArray(data) ? data : [];

  return (
    <View style={styles.reminders}>
      <SnowCap />
      <Text style={styles.title}>Reminders</Text>
      <ScrollView style={styles.reminderList}>
        {reminders && reminders.length === 0 && (
          <Text style={styles.noReminders}>Nothing to remind you of right now.</Text>
        )}
        {reminders && reminders.map(reminder => (
          <Reminder key={reminder.id} reminder={reminder} onComplete={refresh}/>
        ))}
      </ScrollView>
      <ReminderForm onCreate={refresh} />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  reminders: {
    flex: 0,
    padding: 16,
    borderRadius: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noReminders: {
    fontStyle: 'italic',
  }
});
