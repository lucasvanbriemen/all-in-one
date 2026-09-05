import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {api} from '../api';
import {useThemedStyles} from '../theme';

export function HomePage({activeSidebarItem}) {
  const styles = useThemedStyles(createStyles);
  const [serverData, setServerData] = useState(null);

  useEffect(() => {
    // Example API call
    api.get('/server_data').then(response => {
      setServerData(response);
      console.log(response);
    });
  }, []);

  function calculateDiskUsage() {
    if (!serverData) return null;
    const total = serverData.disk.total;
    const used = serverData.disk.used
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

    let string = '';
    if (days > 0) string += `${days}d `;
    if (hours > 0) string += `${hours}h `;
    if (minutes > 0) string += `${minutes}m `;
    if (seconds > 0) string += `${seconds}s`;
    return string;
  }

  return (
    <View style={styles.content}>
      <Text style={styles.text}>Home</Text>

      {serverData && (
        <>
          <Text style={styles.text}>{serverData.cpu_count}</Text>
          <Text style={styles.text}>{calculateDiskUsage().toFixed(2)}%</Text>
          <Text style={styles.text}>{calculateMemoryUsage().toFixed(2)}%</Text>
          <Text style={styles.text}>{uptimeSecondsToProperTime(serverData.uptime_seconds)}</Text>
        </>
      )}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flex: 1,
    flexDirection: 'row',
    gap: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    opacity: 0.5,
    color: colors.onSurfaceVariant,
  },
});
