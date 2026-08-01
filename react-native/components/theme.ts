/**
 * Web palette.
 *
 * `PlatformColor` isn't implemented by react-native-web, so the AppKit system
 * colors have to be spelled out. The native build uses the real system values
 * via `theme.native.ts`, which Metro prefers over this file.
 *
 * These are light-theme values because the web page background is white. The
 * native app is a translucent dark window over the desktop, so the two will
 * not look identical — that difference is inherent, not a bug.
 */
export const accentColor = '#0a84ff';
export const labelColor = 'rgba(0, 0, 0, 0.85)';
