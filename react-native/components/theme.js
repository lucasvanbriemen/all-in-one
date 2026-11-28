import {Platform, useColorScheme} from 'react-native';
import {useEffect, useMemo, useState} from 'react';

const APPLY_CUSTOM_COLORS = true;

/**
 * Same escape hatch as the web version: applied on top of the fetched set.
 *
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

/**
 * The endpoint also serves `-8` / `-12` steps of every colour (at 0.92 and
 * 0.88 alpha). Derive them for the overrides too, or they would keep the
 * suite's blue.
 */
function alphaSteps(colors) {
  const steps = {};

  for (const [name, value] of Object.entries(colors)) {
    for (const [suffix, alpha] of [['-8', 0.92], ['-12', 0.88]]) {
      steps[name + suffix] = {
        dark: value.dark.replace(')', ` / ${alpha})`),
        light: value.light.replace(')', ` / ${alpha})`),
      };
    }
  }

  return steps;
}

/** `on-surface` / `surface-at-1` are awkward to read off an object literal. */
function camelize(name) {
  return name.replace(/-(.)/g, (_, character) => character.toUpperCase());
}

/**
 * One request per launch, shared by every component that themes itself. The
 * palette is static per deploy, so there is nothing to invalidate.
 */
let palettePromise;

/**
 * The palette once it has landed. Components mounted after that start from
 * it, instead of rendering colourless first and re-rendering when the
 * (already resolved) promise calls back.
 */
let loadedColors = null;

function loadColors() {
    return APPLY_CUSTOM_COLORS
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
  const [colors, setColors] = useState(() => loadedColors ?? {});

  useEffect(() => {
    if (loadedColors) {
      return;
    }

    setColors(loadColors())
  }, []);

  return useMemo(() => resolve(colors, scheme), [colors, scheme]);
}

export function useThemedStyles(createStyles) {
  const colors = useTheme();

  return useMemo(() => createStyles(colors), [createStyles, colors]);
}

/**
 * Makes a palette colour translucent.
 *
 * The endpoint hands back CSS colour strings — `rgb(17 19 24)`, and for the
 * `-8`/`-12` steps `rgb(170 199 255 / 0.92)`. React Native renders both, but
 * neither can be dimmed without taking it apart first. This keeps faint
 * fills and hairlines on the shared palette: only the *opacity* is a design
 * constant, the colour always comes from the theme.
 *
 * Any alpha already on the token is multiplied through rather than discarded.
 */
export function withAlpha(color, alpha) {
  if (!color) {
    // useTheme() is empty until the fetch lands; a missing colour must not
    // become an opaque black fill over the sidebar's blur.
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

/**
 * Solid surface levels per semantic variant. There is no translucency left in
 * these: on macOS the only see-through part of the app is the window's
 * sidebar material (see TransparentWindow.jsx), and everything inside the
 * opaque content card separates itself by stepping up the palette's surface
 * levels. iOS has no backdrop at all and keeps its own, flatter steps.
 *
 * `surface` is a card, `subtle` a region nested in one, `tinted` carries
 * status colour (usually with a `tone` override), `accent` and
 * `primaryContainer` are for controls and highlighted items.
 */
const SURFACE_VARIANTS = {
  surface: {ios: 'surfaceAt2', mac: 'surfaceAt3'},
  subtle: {ios: 'surfaceAt1', mac: 'surfaceAt4'},
  tinted: {ios: 'surfaceAt1', mac: 'surfaceAt1'},
  accent: {ios: 'primaryContainer', mac: 'primaryContainer'},
  primaryContainer: {ios: 'primaryContainer', mac: 'primaryContainer'},
};

/**
 * Background style for a variant, or for an explicit palette `tone`.
 * Borders are zeroed so callers that add a `borderWidth` of their own still
 * get a matching colour.
 */
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
