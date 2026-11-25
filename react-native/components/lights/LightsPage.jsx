import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useThemedStyles} from '../theme';
import {useApi} from '../useApi';

// Placeholder while the lights page is rebuilt from the Home Control guide.
// The previous version (colour wheel, white wheel, scenes) is in git: 8f711b2.
export function LightsPage() {
  const styles = useThemedStyles(createStyles);
  const rooms = useApi('/lights').data?.rooms || {}

  return (
    <View style={styles.root}>
      {rooms && Object.values(rooms).map(room => (
        <View key={room.slug}>
          <Text style={styles.text}>{room.name}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.outline,
    fontSize: 15,
  },
});
