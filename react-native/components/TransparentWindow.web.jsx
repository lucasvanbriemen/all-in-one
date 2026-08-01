import {StyleSheet, View} from 'react-native';

import React from 'react';

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

/** Subtle separation from the content pane. Dark, because the page is white. */
const SIDEBAR_TINT = 'rgba(0, 0, 0, 0.04)';

export function TransparentWindow({children}) {
  return (
    <View style={styles.root}>
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.windowBackdrop,
          // Web-only CSS — react-native-web passes it straight through.
          {backdropFilter: WINDOW_BACKDROP, WebkitBackdropFilter: WINDOW_BACKDROP},
        ]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

export function SidebarMaterial({children}) {
  return (
    <View style={styles.sidebarMaterial}>
      <View
        style={[StyleSheet.absoluteFill, {backgroundColor: SIDEBAR_TINT}]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  windowBackdrop: {
    backgroundColor: 'transparent',
  },
  sidebarMaterial: {
    flexDirection: 'row',
  },
});
