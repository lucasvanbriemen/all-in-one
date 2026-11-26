import {StyleSheet, UIManager, View, requireNativeComponent} from 'react-native';
import {useTheme} from './theme';

import React from 'react';

/**
 * AppKit's blur surface. `.behindWindow` blends with the desktop rather than
 * with sibling views, which is what makes the window itself look translucent.
 *
 * There is no built-in React Native equivalent — NSVisualEffectView has to be
 * bridged. See `macos/AllInOne-macOS/VisualEffectBackground.swift`. The window is
 * already set up for it: AppDelegate clears `opaque`, the background colour and
 * the titlebar, so there is nothing opaque between this view and the desktop.
 *
 * The web build has its own TransparentWindow.web.jsx with a solid fill.
 */
const NATIVE_NAME = 'VisualEffectBackground';

const hasNativeBlur = UIManager.getViewManagerConfig?.(NATIVE_NAME) != null;

// Cached on `globalThis` rather than in a module-level `const`: Fast Refresh
// re-runs this file on every edit, and `requireNativeComponent` registers the
// view config eagerly. Registering the same name twice is an invariant
// violation ("Tried to register two views with the same name"), so the module
// scope has to survive hot updates.
const NativeVisualEffect = hasNativeBlur
  ? (globalThis.__nativeVisualEffect ??= requireNativeComponent(NATIVE_NAME))
  : null;

/**
 * The window's backdrop. The `sidebar` material is what Finder, Mail and
 * Notes use; the opaque content card (App.jsx) covers most of it, so the
 * desktop only shows through the sidebar and the thin margin around the card.
 * Changing the material only needs a Metro reload — the native side reads it
 * as a prop.
 *
 * Without the native module (iOS) there is nothing to blend with, so the
 * window is a plain surface.
 */
const WINDOW_MATERIAL = 'sidebar';

export function TransparentWindow({children}) {
  const colors = useTheme();

  if (!NativeVisualEffect) {
    return (
      <View style={[styles.root, {backgroundColor: colors.surface}]}>
        {children}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <NativeVisualEffect
        materialName={WINDOW_MATERIAL}
        blendsBehindWindow
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
