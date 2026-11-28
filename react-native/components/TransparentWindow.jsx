import {Platform, PlatformColor, StyleSheet, View} from 'react-native';

import React from 'react';

/**
 * The window's backdrop. On macOS the window itself is clear glass: AppDelegate
 * makes it non-opaque and has the window server blur the desktop behind it
 * (`WindowBlurRadius`, needs a native rebuild). This only adds the tint on top
 * so text stays readable — keep its alpha low; it updates on a Metro reload.
 *
 * iOS has no desktop to show through, so the window is a plain surface.
 */
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
