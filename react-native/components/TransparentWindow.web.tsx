import React from 'react';
import {StyleSheet, View} from 'react-native';

/**
 * Web stand-in for the AppKit visual-effect background.
 *
 * This is NOT equivalent to the macOS version and can't be. `.behindWindow`
 * blending samples the desktop behind the window; a browser tab has no
 * desktop. `backdrop-filter` only blurs page content behind the element, so
 * here it blurs the page background rather than the OS.
 *
 * The result is decorative: correct layout, plausible frosted look, but the
 * window translucency that motivated the native app is simply absent.
 *
 * `requireNativeComponent` is deliberately not imported — react-native-web
 * doesn't export it, and a static import would fail the Vite build. Resolving
 * this file ahead of `TransparentWindow.tsx` on web keeps that import off the
 * web bundle entirely.
 */

const WINDOW_BACKDROP = 'blur(30px) saturate(160%)';
const SIDEBAR_TINT = 'rgba(255, 255, 255, 0.16)';

export function TransparentWindow({children}: {children: React.ReactNode}) {
  return (
    <View style={styles.root}>
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.windowBackdrop,
          // @ts-expect-error — web-only CSS, not part of the RN style types.
          {backdropFilter: WINDOW_BACKDROP, WebkitBackdropFilter: WINDOW_BACKDROP},
        ]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

export function SidebarMaterial({children}: {children: React.ReactNode}) {
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
    backgroundColor: 'rgba(30, 30, 30, 0.45)',
  },
  sidebarMaterial: {
    flexDirection: 'row',
  },
});
