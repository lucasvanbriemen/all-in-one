import {Pressable, StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {glass, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import {api} from '../api';

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
        <Text style={styles.date}>{formatRemindAt(reminder.remind_at)}</Text>
      </View>

      <Pressable onPress={complete} hitSlop={8}>
        <Icon name="cross" size={24} color={styles.complete.color} />
      </Pressable>
    </View>
  );
}

function formatRemindAt(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {weekday: 'short', day: 'numeric', month: 'short'});
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
