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
  reminders: {
    flex: 1,
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
  },
  reminderList: {flex: 1},
});
