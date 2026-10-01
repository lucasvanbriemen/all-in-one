import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import React from 'react';
import {api} from '../api';
import {format} from "../money/format";

export function Reminder({reminder, onComplete}) {
  const styles = useThemedStyles(createStyles);

  async function complete() {
    await api.post(`/reminders/${reminder.id}`);
    onComplete(reminder);
  }

  return (
    <View style={styles.reminder}>
      <View style={styles.text}>
        <Text style={styles.title}>{reminder.title}</Text>
        {reminder.description ? <Text style={styles.body}>{reminder.description}</Text> : null}
        <Text style={styles.date}>{format.date(reminder.remind_at)}</Text>
      </View>

      <Pressable onPress={complete} hitSlop={8}>
        <Icon name="cross" size={24} color={styles.complete.color} />
      </Pressable>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  reminder: {
    ...glass(colors, {variant: 'subtle'}),
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  text: {flex: 1},
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.onSurface,
  },
  body: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  date: {
    fontSize: 12,
    marginTop: 4,
    color: colors.outline,
  },
  complete: {
    color: colors.primary,
  },
});
