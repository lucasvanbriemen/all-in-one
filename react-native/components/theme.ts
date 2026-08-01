/**
 * Web palette.
 *
 * `PlatformColor` isn't implemented by react-native-web, so the AppKit system
 * colors have to be spelled out. These approximate macOS dark-mode
 * `controlAccentColor` and `labelColor`; the native build uses the real system
 * values via `theme.native.ts`, which Metro prefers over this file.
 */
export const accentColor = '#0a84ff';
export const labelColor = 'rgba(255, 255, 255, 0.92)';
