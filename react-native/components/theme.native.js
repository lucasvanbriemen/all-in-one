import {PlatformColor} from 'react-native';

/**
 * The real AppKit system colors, so the app tracks the user's accent choice
 * and light/dark mode automatically. Metro resolves `.native.js` ahead of
 * `theme.js`, which is the web fallback.
 */
export const accentColor = PlatformColor('controlAccentColor');
export const labelColor = PlatformColor('labelColor');
