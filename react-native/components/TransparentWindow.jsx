import {StyleSheet, UIManager, View, requireNativeComponent} from 'react-native';
import {glass, useTheme} from './theme';

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
 * On the web build (and if the native module ever fails to register) there is
 * no NSVisualEffectView, so this degrades to a plain translucent fill — tinted
 * from the palette, so it still tracks light/dark.
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
 * Material used for the window itself. Changing this only needs a Metro
 * reload — the native side reads it as a prop.
 */
const WINDOW_MATERIAL = 'hudWindow';

export function TransparentWindow({children}) {
  const colors = useTheme();

  return (
    <View style={styles.root}>
      {NativeVisualEffect ? (
        <NativeVisualEffect
          materialName={WINDOW_MATERIAL}
          blendsBehindWindow
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            {backgroundColor: glass(colors, {tone: "surface"})},
          ]}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
}

/**
 * Panels deliberately do NOT get their own NSVisualEffectView by default.
 *
 * SwiftUI layered `.ultraThinMaterial` over the window's `.hudWindow` blur.
 * Reproducing that with a second AppKit material stacks two blurs, and every
 * available material is heavier than `.ultraThinMaterial` — the panel ends up
 * noticeably more opaque than the original. Letting the window's existing blur
 * show through and adding only a palette-derived tint is both closer to the
 * SwiftUI look and strictly more transparent.
 *
 * Pass `material="underWindowBackground"` to opt a single panel back into a
 * real second blur.
 */
export function GlassPanel({children, style, material = null, ...rest}) {
  return (
    <View style={[styles.panel, style]} {...rest}>
      {material && NativeVisualEffect ? (
        <NativeVisualEffect
          materialName={material}
          blendsBehindWindow={false}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  panel: {
    // The material is an absolutely-filled child, so a `borderRadius` passed
    // in through `style` only rounds the corners if the fill is clipped.
    overflow: 'hidden',
  },
});
