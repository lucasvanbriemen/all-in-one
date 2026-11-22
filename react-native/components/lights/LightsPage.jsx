import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useThemedStyles} from '../theme';

// Placeholder while the lights page is rebuilt from the Home Control guide.
// The previous version (colour wheel, white wheel, scenes) is in git: 8f711b2.
export function LightsPage() {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.root}>
      <Text style={styles.text}>Lights</Text>
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
