import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

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
      <Text style={styles.title}>{notification.title}</Text>
      <Text style={styles.body}>{notification.body}</Text>

      <Pressable onPress={markAsRead}>
        <Text style={styles.markAsRead}>Mark as Read</Text>
      </Pressable>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  notification: {
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
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
    fontSize: 14,
    color: colors.primary,
    marginTop: 8,
  },
});
