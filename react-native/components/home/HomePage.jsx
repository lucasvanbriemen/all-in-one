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

  return (
    <View style={styles.content}>
      <Text style={styles.text}>Home</Text>
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
