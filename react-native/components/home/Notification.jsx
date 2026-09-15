import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import {api} from '../api';

export function Notification({notification}) {
  const styles = useThemedStyles(createStyles);

  const [isRead, setIsRead] = useState(notification.read);

  async function markAsRead() {
    await api.post(`/notifications/${notification.id}/mark_as_read`)
    setIsRead(true);
  }

  if (isRead) return null;

  return (
    <View style={styles.notification}>
      <View style={styles.text}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.body}>{notification.body}</Text>
      </View>

      <Pressable onPress={markAsRead}>
        <Icon name="cross" size={24} color={styles.markAsRead.color} />
      </Pressable>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  text: {
    flex: 1,
  },
  notification: {
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  body: {
    fontSize: 14,
  },
  markAsRead: {
    color: colors.primary,
  },
});
