import {StyleSheet, UIManager, View, requireNativeComponent} from 'react-native';

import React from 'react';

/**
 * AppKit's blur surface. `.behindWindow` blends with the desktop rather than
 * with sibling views, which is what makes the window itself look translucent.
 *
 * There is no built-in React Native equivalent — NSVisualEffectView has to be
 * bridged. See `macos/MyApp-macOS/VisualEffectBackground.swift`. If the native
 * module isn't registered, this degrades to a plain translucent fill so the
 * app still renders.
 */
const NATIVE_NAME = 'VisualEffectBackground';

const hasNativeBlur = UIManager.getViewManagerConfig?.(NATIVE_NAME) != null;

const NativeVisualEffect = hasNativeBlur
  ? requireNativeComponent(NATIVE_NAME)
  : null;

/**
 * Material used for the window itself. Changing this only needs a Metro
 * reload — the native side reads it as a prop.
 */
const WINDOW_MATERIAL = 'hudWindow';

/**
 * The sidebar deliberately does NOT get its own NSVisualEffectView.
 *
 * SwiftUI layered `.ultraThinMaterial` over the window's `.hudWindow` blur.
 * Reproducing that with a second AppKit material stacks two blurs, and every
 * available material is heavier than `.ultraThinMaterial` — the sidebar ends
 * up noticeably more opaque than the original. Letting the window's existing
 * blur show through and adding only a faint tint is both closer to the
 * SwiftUI look and strictly more transparent.
 *
 * Set this to a material name (e.g. 'underWindowBackground') to go back to a
 * real second blur.
 */
const SIDEBAR_MATERIAL = null;

/** Tint strength when SIDEBAR_MATERIAL is null. 0 = invisible, 1 = white. */
const SIDEBAR_TINT = 'rgba(255, 255, 255, 0.16)';

export function TransparentWindow({children}) {
  return (
    <View style={styles.root}>
      {NativeVisualEffect ? (
        <NativeVisualEffect
          materialName={WINDOW_MATERIAL}
          blendsBehindWindow
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]} />
      )}
      {children}
    </View>
  );
}

export function SidebarMaterial({children, style}) {
  return (
    <View style={[styles.sidebarMaterial, style]}>
      {NativeVisualEffect && SIDEBAR_MATERIAL ? (
        <NativeVisualEffect
          materialName={SIDEBAR_MATERIAL}
          blendsBehindWindow
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[StyleSheet.absoluteFill, {backgroundColor: SIDEBAR_TINT}]}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fallback: {
    backgroundColor: 'rgba(30, 30, 30, 0.55)',
  },
  sidebarMaterial: {
    flexDirection: 'row',
    // The material is an absolutely-filled child, so a `borderRadius` passed
    // in through `style` only rounds the corners if the fill is clipped.
    overflow: 'hidden',
  },
});
