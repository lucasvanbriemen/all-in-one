import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {Notification} from './Notification';
import {Stat} from './Stat';
import {api} from '../api';
import {useThemedStyles} from '../theme';

export function HomePage({activeSidebarItem}) {
  const styles = useThemedStyles(createStyles);
  const [serverData, setServerData] = useState(null);
  const [notifications, setNotifications] = useState(null);

  useEffect(() => {
    api.get('/server_data').then(response => {
      setServerData(response.server_data);
      setNotifications(response.notifications);
      console.log(response.server_data);
    });
  }, []);

  function greeting() {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning!";
    if (hours < 18) return "Good afternoon!";
    return "Good evening!";
  }

  return (
    <View style={styles.content}>
      <View style={styles.statsContainer}>
        {serverData && serverData.map((data, index) => (
          <Stat key={index} value={data.value} label={data.label} attentionLevel={data.importance_level} />
        ))} 
      </View>

      <Text style={styles.greeting}>{greeting()}</Text>

      {notifications && notifications.map((notification, index) => (
        <Notification key={index} notification={notification} />
      ))}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
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
});
