import {StyleSheet, View} from 'react-native';

import React from 'react';
import {useThemedStyles} from './theme';

/**
 * Web stand-in for the AppKit visual-effect background.
 *
 * This is NOT equivalent to the macOS version and can't be. `.behindWindow`
 * blending samples the desktop behind the window; a browser tab has no
 * desktop. `backdrop-filter` only blurs page content behind the element, so
 * over a plain white page it has nothing to act on and renders flat. It is
 * kept only so the surface still frosts if a background image is added later.
 *
 * `requireNativeComponent` is deliberately not imported — react-native-web
 * doesn't export it, and a static import would fail the Vite build. Resolving
 * this file ahead of `TransparentWindow.jsx` on web keeps that import off the
 * web bundle entirely.
 */

const WINDOW_BACKDROP = 'blur(30px) saturate(160%)';

export function TransparentWindow({children}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.root}>
      <View
        style={[StyleSheet.absoluteFill, styles.windowBackdrop]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

export function SidebarMaterial({children}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.sidebarMaterial}>
      <View
        style={[StyleSheet.absoluteFill, styles.sidebarTint]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  root: {
    flex: 1,
  },
  windowBackdrop: {
    // The window has no desktop to be translucent over, so it paints the
    // palette's own background. Without it the app would draw dark-mode text
    // over index.html's white body.
    backgroundColor: colors.background,
    // Web-only CSS — react-native-web passes it straight through.
    backdropFilter: WINDOW_BACKDROP,
    WebkitBackdropFilter: WINDOW_BACKDROP,
  },
  sidebarMaterial: {
    flexDirection: 'row',
  },
  /** Subtle separation from the content pane, in both appearances. */
  sidebarTint: {
    backgroundColor: colors.surfaceAt2,
  },
});
