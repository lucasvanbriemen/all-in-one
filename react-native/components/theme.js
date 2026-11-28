import {Platform, useColorScheme} from 'react-native';
import {useMemo} from 'react';

/**
 * Material 3 SchemeContent at medium contrast (0.5), generated with
 * material-color-utilities from the two wall paints as palette sources, with
 * no hand-pinned roles:
 *   - primary palette:   Histor "Still Searching" #48634D (Content keeps the
 *                        source tone, so light primary-container is exactly
 *                        the paint; filled buttons/badges use that role)
 *   - secondary palette: Karwei K-331 #D3DFD5 (at medium contrast dark
 *                        secondary lands exactly on the paint)
 *   - neutrals:          K-331's hue at chroma 2 / 4, so surfaces read grey
 * success (#00897B, teal) is an unharmonized custom colour so it stays
 * distinct from the greens; warning (#F9A825) is harmonized toward the seed.
 */
const customColors = {
  'primary': {dark: 'rgb(198 228 200)', light: 'rgb(34 60 40)'},
  'on-primary': {dark: 'rgb(17 43 25)', light: 'rgb(255 255 255)'},
  'primary-container': {dark: 'rgb(123 152 127)', light: 'rgb(72 99 77)'},
  'on-primary-container': {dark: 'rgb(0 0 0)', light: 'rgb(255 255 255)'},
  'secondary': {dark: 'rgb(211 223 213)', light: 'rgb(46 57 50)'},
  'on-secondary': {dark: 'rgb(30 40 34)', light: 'rgb(255 255 255)'},
  'secondary-container': {dark: 'rgb(136 148 139)', light: 'rgb(100 112 104)'},
  'on-secondary-container': {dark: 'rgb(0 0 0)', light: 'rgb(255 255 255)'},
  'tertiary': {dark: 'rgb(200 223 247)', light: 'rgb(34 56 75)'},
  'on-tertiary': {dark: 'rgb(16 40 57)', light: 'rgb(255 255 255)'},
  'tertiary-container': {dark: 'rgb(125 147 169)', light: 'rgb(73 95 115)'},
  'on-tertiary-container': {dark: 'rgb(0 0 0)', light: 'rgb(255 255 255)'},
  'error': {dark: 'rgb(255 210 204)', light: 'rgb(116 0 6)'},
  'on-error': {dark: 'rgb(84 0 3)', light: 'rgb(255 255 255)'},
  'error-container': {dark: 'rgb(255 84 73)', light: 'rgb(207 44 39)'},
  'on-error-container': {dark: 'rgb(0 0 0)', light: 'rgb(255 255 255)'},
  'success': {dark: 'rgb(112 216 200)', light: 'rgb(0 107 95)'},
  'on-success': {dark: 'rgb(0 55 49)', light: 'rgb(255 255 255)'},
  'success-container': {dark: 'rgb(0 80 72)', light: 'rgb(141 245 228)'},
  'on-success-container': {dark: 'rgb(141 245 228)', light: 'rgb(0 32 28)'},
  'warning': {dark: 'rgb(244 191 42)', light: 'rgb(119 90 0)'},
  'on-warning': {dark: 'rgb(63 46 0)', light: 'rgb(255 255 255)'},
  'warning-container': {dark: 'rgb(90 67 0)', light: 'rgb(255 223 153)'},
  'on-warning-container': {dark: 'rgb(255 223 153)', light: 'rgb(37 26 0)'},
  'surface-tint': {dark: 'rgb(176 206 179)', light: 'rgb(74 101 79)'},
  'background': {dark: 'rgb(18 20 19)', light: 'rgb(251 249 247)'},
  'on-background': {dark: 'rgb(227 226 224)', light: 'rgb(27 28 27)'},
  'surface': {dark: 'rgb(18 20 19)', light: 'rgb(251 249 247)'},
  'on-surface': {dark: 'rgb(255 255 255)', light: 'rgb(16 17 16)'},
  'surface-variant': {dark: 'rgb(68 72 69)', light: 'rgb(225 227 223)'},
  'on-surface-variant': {dark: 'rgb(219 221 217)', light: 'rgb(52 55 52)'},
  'outline': {dark: 'rgb(176 179 175)', light: 'rgb(80 83 80)'},
  'outline-variant': {dark: 'rgb(142 145 141)', light: 'rgb(107 110 106)'},
  'shadow': {dark: 'rgb(0 0 0)', light: 'rgb(0 0 0)'},
  'scrim': {dark: 'rgb(0 0 0)', light: 'rgb(0 0 0)'},
  'inverse-surface': {dark: 'rgb(227 226 224)', light: 'rgb(48 49 47)'},
  'inverse-on-surface': {dark: 'rgb(41 42 41)', light: 'rgb(242 240 238)'},
  'inverse-primary': {dark: 'rgb(52 78 57)', light: 'rgb(176 206 179)'},
  'surface-at-1': {dark: 'rgb(7 8 7)', light: 'rgb(255 255 255)'},
  'surface-at-2': {dark: 'rgb(29 30 29)', light: 'rgb(245 243 241)'},
  'surface-at-3': {dark: 'rgb(39 40 39)', light: 'rgb(233 232 230)'},
  'surface-at-4': {dark: 'rgb(50 51 49)', light: 'rgb(222 221 218)'},
  'surface-at-5': {dark: 'rgb(61 62 60)', light: 'rgb(210 209 207)'},
  // starred: {dark: 'rgb(238 222 108)', light: 'rgb(248 255 38)'},
};

/** `on-surface` / `surface-at-1` are awkward to read off an object literal. */
function camelize(name) {
  return name.replace(/-(.)/g, (_, character) => character.toUpperCase());
}

function resolve(colors, scheme) {
  const resolved = Object.fromEntries(
    Object.entries(colors).map(([name, value]) => [
      camelize(name),
      value[scheme],
    ]),
  );

  // Not a colour: lets components pick light/dark specifics without
  // threading `useColorScheme()` through.
  resolved.scheme = scheme;

  return resolved;
}

export function useTheme() {
  const scheme = useColorScheme() ?? 'light';

  return useMemo(() => resolve(customColors, scheme), [scheme]);
}

export function useThemedStyles(createStyles) {
  const colors = useTheme();

  return useMemo(() => createStyles(colors), [createStyles, colors]);
}

export function withAlpha(color, alpha) {
  if (!color) {
    return 'transparent';
  }

  const parts = String(color).match(/[\d.]+/g);

  if (!parts || parts.length < 3) {
    return color;
  }

  const [red, green, blue] = parts;
  const existing = parts.length > 3 ? Number(parts[3]) : 1;

  return `rgba(${red}, ${green}, ${blue}, ${alpha * existing})`;
}

const SURFACE_VARIANTS = {
  surface: {ios: 'surfaceAt2', mac: 'surfaceAt3'},
  subtle: {ios: 'surfaceAt1', mac: 'surfaceAt4'},
  tinted: {ios: 'surfaceAt1', mac: 'surfaceAt1'},
  accent: {ios: 'primaryContainer', mac: 'primaryContainer'},
  primaryContainer: {ios: 'primaryContainer', mac: 'primaryContainer'},
};

export function surfaceStyle(colors, options = {}) {
  const {variant = 'surface'} = options;
  const levels = SURFACE_VARIANTS[variant] ?? SURFACE_VARIANTS.surface;
  const tone = options.tone ?? (Platform.OS === 'ios' ? levels.ios : levels.mac);
  const backgroundColor = colors[tone] ?? colors.surface;

  return {
    backgroundColor,
    borderWidth: 0,
    borderColor: backgroundColor,
    borderTopColor: backgroundColor,
  };
}
