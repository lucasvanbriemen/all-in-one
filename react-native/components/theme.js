import {Platform, useColorScheme} from 'react-native';
import {useEffect, useMemo, useState} from 'react';

/**
 * Shared palette.
 *
 * The colors come from the same endpoint the web apps theme themselves with
 * (`objects/theme.js` in ui-components), so this app can't drift from the
 * rest of the suite. That file writes the values into CSS custom properties;
 * React Native has no cascade, so components read them through `useTheme()`.
 *
 * This replaces the AppKit `PlatformColor` mapping that used to live in
 * `theme.native.js` — matching the shared palette is worth more than tracking
 * the user's macOS accent color, and one file now covers both builds.
 */
const THEME_URL = 'https://components.lucasvanbriemen.nl/api/colors';

/** Same escape hatch as the web version: applied on top of the fetched set. */
const customColors = {
  // starred: {dark: 'rgb(238 222 108)', light: 'rgb(248 255 38)'},
};

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
  palettePromise ??= fetch(THEME_URL)
    .then(response => response.json())
    .catch(() => ({}))
    .then(fetched => {
      loadedColors = {...fetched, ...customColors};
      return loadedColors;
    });

  return palettePromise;
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

    let cancelled = false;

    loadColors().then(fetched => {
      if (!cancelled) {
        setColors(fetched);
      }
    });

    return () => {
      cancelled = true;
    };
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
  accent: {ios: 'primary', mac: 'primary'},
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
