import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {api} from '../api';

export function Notification({notification}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.notification}>
      <Text style={styles.title}>{notification.title}</Text>
      <Text style={styles.body}>{notification.body}</Text>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  notification: {
    ...glass(colors),
    padding: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  body: {
    fontSize: 14,
  },
});
