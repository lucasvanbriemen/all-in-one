import {useEffect, useMemo, useState} from 'react';

import {useColorScheme} from 'react-native';

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

/**
 * Painted until the request lands, and for good if it never does — a desktop
 * app shouldn't render blank because it started offline. Only the names the
 * UI actually reads; anything else resolves to `undefined`, which React
 * Native treats as "no color" rather than throwing.
 */
const fallbackColors = {
  primary: {dark: 'rgb(170 199 255)', light: 'rgb(65 94 145)'},
  'on-primary': {dark: 'rgb(11 48 95)', light: 'rgb(255 255 255)'},
  background: {dark: 'rgb(17 19 24)', light: 'rgb(249 249 255)'},
  'on-surface': {dark: 'rgb(226 226 233)', light: 'rgb(25 28 32)'},
  'surface-at-2': {dark: 'rgb(25 28 32)', light: 'rgb(243 243 250)'},
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

function loadColors() {
  palettePromise ??= fetch(THEME_URL)
    .then(response => response.json())
    .catch(() => ({}));

  return palettePromise;
}

function resolve(colors, scheme) {
  return Object.fromEntries(
    Object.entries(colors).map(([name, value]) => [
      camelize(name),
      value[scheme],
    ]),
  );
}

/**
 * Every color of the palette for the current appearance, e.g.
 * `const {primary, onSurface} = useTheme()`.
 *
 * Prefer `useThemedStyles` for anything that ends up in a stylesheet; this is
 * for colors passed as props, like an SVG icon's fill.
 */
export function useTheme() {
  // `useColorScheme` is null while the OS preference is unknown. Both the web
  // page and a freshly opened AppKit window are light, so match that.
  const scheme = useColorScheme() ?? 'light';
  const [colors, setColors] = useState(fallbackColors);

  useEffect(() => {
    let cancelled = false;

    loadColors().then(fetched => {
      if (!cancelled) {
        setColors({...fallbackColors, ...fetched, ...customColors});
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => resolve(colors, scheme), [colors, scheme]);
}

/**
 * Keeps colors inside the stylesheet instead of scattered through the markup:
 *
 *   export default function App() {
 *     const styles = useThemedStyles(createStyles);
 *     ...
 *   }
 *
 *   const createStyles = colors =>
 *     StyleSheet.create({title: {fontSize: 26, color: colors.onSurface}});
 *
 * A module-level `StyleSheet.create` can't do this. It runs once at import,
 * which is before the palette has been fetched and before the app knows the
 * OS appearance — so the styles have to be built during render instead, and
 * anything built during render has to come from a hook. Passing the factory
 * in keeps that to a single line per component; the result is rebuilt only
 * when the palette or the appearance actually changes.
 */
export function useThemedStyles(createStyles) {
  const colors = useTheme();

  return useMemo(() => createStyles(colors), [createStyles, colors]);
}
