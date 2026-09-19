import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import {api} from '../api';
import {useAppContext} from '../../context/AppContext';

export function Notification({notification}) {
  const styles = useThemedStyles(createStyles);
  const { get, set } = useAppContext();

  const [isRead, setIsRead] = useState(notification.read);

  async function markAsRead() {
    await api.post(`/notifications/${notification.id}/mark_as_read`)
    setIsRead(true);
  }

  async function openNotification() {
    const sourceAsArray = notification.source.split('.');

    set('app.activeApp', sourceAsArray[0]);
    set('app.activeSidebarItem', sourceAsArray[1]);
    set('email.selectedEmailId', sourceAsArray[2]);
  }

  if (isRead) return null;

  return (
    <View style={styles.notification}>
      <Pressable style={styles.text} onPress={openNotification}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.body}>{notification.body}</Text>
      </Pressable>

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
    color: colors.onSurface,
  },
  body: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  markAsRead: {
    color: colors.primary,
  },
});
