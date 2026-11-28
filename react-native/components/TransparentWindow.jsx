import {Platform, PlatformColor, StyleSheet, View} from 'react-native';

const WINDOW_TINT = 'rgba(255, 255, 255, 0.25)';

export function TransparentWindow({children}) {
  return <View style={[styles.root, Platform.OS === 'macos' ? styles.tint : styles.solid]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tint: {
    backgroundColor: WINDOW_TINT,
  },
  solid: {
    backgroundColor: PlatformColor('systemBackground'),
  },
});
