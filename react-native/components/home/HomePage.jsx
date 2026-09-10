import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

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
      console.log(response.server_data);
    });
  }, []);

  function calculateDiskUsage(data) {
    if (!data) return null;
    const total = data.disk.total;
    const used = data.disk.used
    return (used / total) * 100;
  }

  function calculateMemoryUsage() {
    if (!serverData) return null;
    const total = serverData.memory.total;
    const used = serverData.memory.used;
    return (used / total) * 100;
  }

  function uptimeSecondsToProperTime(seconds) {
    if (!seconds) return null;
    const days = Math.floor(seconds / (24 * 3600));
    seconds %= 24 * 3600;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    seconds = Math.floor(seconds);

    let string = '';
    if (days > 0) string += `${days}d `;
    if (hours > 0) string += `${hours}h `;
    if (minutes > 0) string += `${minutes}m `;
    if (seconds > 0) string += `${seconds}s`;
    return string;
  }

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
