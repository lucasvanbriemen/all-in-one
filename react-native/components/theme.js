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

/**
 * Makes a palette colour translucent.
 *
 * The endpoint hands back CSS colour strings — `rgb(17 19 24)`, and for the
 * `-8`/`-12` steps `rgb(170 199 255 / 0.92)`. React Native renders both, but
 * neither can be dimmed without taking it apart first. This is what keeps the
 * translucent surfaces on the shared palette instead of the hardcoded
 * `rgba(255, 255, 255, 0.16)` tints the glass used to be built from: only the
 * *opacity* is a design constant, the colour always comes from the theme.
 *
 * Any alpha already on the token is multiplied through rather than discarded.
 */
export function withAlpha(color, alpha) {
  if (!color) {
    // useTheme() is empty until the fetch lands; a missing colour must not
    // become an opaque black fill over the window's blur.
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

const GLASS_VARIANTS = {
  subtle: {
    tone: 'surfaceAt1', tint: 0.25, border: 0.18, highlight: 0.12,
  },
  surface: {
    tone: 'surfaceAt1', tint: 0.5, border: 0.25, highlight: 0.18,
  },
  tinted: {
    tone: 'surfaceAt1',
    tint: 0.52,
    border: 0.65,
    highlight: 0.28,
    useToneForBorder: true,
  },
  accent: {
    tone: 'primary',
    tint: 0.82,
    border: 0.9,
    highlight: 0.5,
    useToneForBorder: true,
    raised: true,
  },
};

/**
 * Shared glass materials. Callers choose a semantic variant instead of tuning
 * unrelated alpha values until one backdrop happens to look right.
 *
 * `surface` is the normal panel, `subtle` separates nested regions, `tinted`
 * carries status colour, and `accent` gives interactive controls enough colour
 * and depth to read as enabled while remaining translucent.
 */
export function glass(colors, options = {}) {
  const {variant = 'surface'} = options;
  const recipe = GLASS_VARIANTS[variant] ?? GLASS_VARIANTS.surface;
  const tone = options.tone ?? recipe.tone;
  const tint = options.tint ?? recipe.tint;
  const border = options.border ?? recipe.border;
  const highlight = options.highlight ?? recipe.highlight;
  const borderTone = options.borderTone
    ?? (recipe.useToneForBorder ? tone : 'outline');

  // A specular reflection stays light in both colour schemes. Callers can
  // opt into a palette token when the material needs a coloured edge.
  const highlightColor = options.highlightTone
    ? colors[options.highlightTone]
    : 'rgb(255 255 255)';

  const style = {
    backgroundColor: withAlpha(colors[tone], tint),
    borderWidth: 1,
    borderColor: withAlpha(colors[borderTone], border),
    borderTopColor: withAlpha(highlightColor, highlight),
  };

  if (recipe.raised) {
    Object.assign(style, {
      shadowColor: colors[tone],
      shadowOffset: {width: 0, height: 3},
      shadowOpacity: 0.28,
      shadowRadius: 8,
      elevation: 4,
    });
  }

  return style;
}
