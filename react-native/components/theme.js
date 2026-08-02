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

export function useTheme() {
  const scheme = useColorScheme() ?? 'light';
  const [colors, setColors] = useState([]);

  useEffect(() => {
    let cancelled = false;

    loadColors().then(fetched => {
      if (!cancelled) {
        setColors({...fetched, ...customColors});
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
