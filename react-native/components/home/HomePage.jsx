import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {Notification} from './Notification';
import {Stat} from './Stat';
import {api} from '../api';
import {greeting} from './greeting';
import {useThemedStyles} from '../theme';

export function HomePage({activeSidebarItem}) {
  const styles = useThemedStyles(createStyles);
  const [serverData, setServerData] = useState(null);
  const [notifications, setNotifications] = useState(null);

  useEffect(() => {
    api.get('/server_data').then(response => {
      setServerData(response);
    });

    api.get('/notifications').then(response => {
      setNotifications(response);
    });
  }, []);

  return (
    <View style={styles.content}>
      <View style={styles.statsContainer}>
        {serverData && serverData.map((data, index) => (
          <Stat key={index} value={data.value} label={data.label} attentionLevel={data.importance_level} />
        ))} 
      </View>

      <Text style={styles.greeting}>{greeting.generateGreeting()}</Text>

      <ScrollView style={styles.notificationsContainer}>
        {notifications && notifications.map((notification, index) => (
          <Notification key={index} notification={notification} />
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
    color: colors.outline
  },
  notificationsContainer: {
    marginTop: 16,
  },
});
