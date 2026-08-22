import OneDark from './themes/OneDark.json';
import OneLight from './themes/OneLight.json';

export const MONACO_VERSION = '0.52.2';
export const MONACO_CDN = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min`;

/**
 * Monaco ships Monarch tokenizers and the two themes VS Code grew out of, not
 * the TextMate grammars and themes VS Code actually runs — so `vs-dark` colours
 * a dozen token kinds where a real theme colours two hundred. Shiki closes the
 * gap: it is VS Code's own tokenizer, and `shikiToMonaco` hands the result to
 * Monaco in place of Monarch's.
 */
export const SHIKI_VERSION = '4.4.3';
export const SHIKI_CDN = `https://esm.sh/shiki@${SHIKI_VERSION}`;
export const SHIKI_MONACO_CDN = `https://esm.sh/@shikijs/monaco@${SHIKI_VERSION}`;

/** Monaco takes `#rrggbbaa`, so a surface can opt out of painting entirely. */
const TRANSPARENT = '#00000000';

export const EDITOR_OPTIONS = {
  automaticLayout: true,
  minimap: {enabled: false},
  scrollBeyondLastLine: false,
  fontSize: 14,
  padding: {top: 12, bottom: 12},
  stickyScroll: {enabled: false},
};

/**
 * The panel sits on the window's blur, so every surface the editor would paint
 * itself is dropped. Fixed colours, unlike the palette-derived ones below, so
 * they are folded into the theme before Shiki ever sees it — a theme defined
 * with its own `#282C34` would flash that slab in before the palette lands.
 */
const SURFACES = {
  // Monaco inherits VS Code's chrome, which rings the focused editor in
  // `#007fd4`. There is no surrounding IDE here for that ring to belong
  // to — the panel's own border is the edge.
  focusBorder: TRANSPARENT,
  contrastBorder: TRANSPARENT,
  contrastActiveBorder: TRANSPARENT,
  'editor.background': TRANSPARENT,
  'editorGutter.background': TRANSPARENT,
  'minimap.background': TRANSPARENT,
  'editorOverviewRuler.background': TRANSPARENT,
};

/**
 * Straight copies of the theme files VS Code is reading, from
 * `akamud.vscode-theme-onedark` / `-onelight`; re-syncing one is a `cp`. Only
 * `type` is added — the extension declares light or dark in its manifest
 * rather than in the theme, and Shiki reads it off the theme.
 */
function vsCodeTheme(theme, type) {
  return {...theme, type, colors: {...theme.colors, ...SURFACES}};
}

const ONE_DARK = vsCodeTheme(OneDark, 'dark');
const ONE_LIGHT = vsCodeTheme(OneLight, 'light');

/** Keyed by the name Shiki and Monaco both know the theme by. */
export const THEMES = {[ONE_DARK.name]: ONE_DARK, [ONE_LIGHT.name]: ONE_LIGHT};

/**
 * Shiki needs its grammars named up front, and `shikiToMonaco` only takes over
 * a grammar whose id some Monaco mode already claims — so these are Monaco's
 * ids, not Shiki's preferred spellings. Embedded grammars come along on their
 * own: `erb` pulls in `ruby` and `html`, `html` pulls in `css` and `javascript`.
 */
export const SHIKI_LANGS = [
  'tsx',
  'jsx',
  'ruby',
  'erb',
  'html',
  'css',
  'scss',
  'less',
  'json',
  'yaml',
  'markdown',
  'shell',
  'sql',
  'python',
  'dockerfile',
  'xml',
  'graphql',
];

/**
 * TypeScript's grammar has no JSX in it — VS Code reaches for the React
 * variant on `.tsx`, and Monaco has no separate mode to reach for. The React
 * grammars are supersets, so they can back the plain modes outright and a
 * component highlights the same whichever extension it was saved under.
 */
export const SHIKI_LANG_ALIAS = {typescript: 'tsx', javascript: 'jsx'};

/**
 * Monaco has no ERB mode, so nothing claims `.erb` and a template opens as
 * plaintext. Registering the id is the whole fix — Shiki brings the grammar,
 * and `languageForPath` can finally resolve the extension.
 */
export const EXTRA_LANGUAGES = [{id: 'erb', extensions: ['.erb']}];

/**
 * Monaco only accepts `#rrggbb`, while the palette hands back CSS colour
 * strings — `rgb(17 19 24)`, sometimes with an alpha step. Alpha is dropped:
 * the editor paints its own opaque surface.
 */
export function toHex(color) {
  const value = String(color ?? '');

  if (value.startsWith('#')) {
    return value;
  }

  const parts = value.match(/\d+(?:\.\d+)?/g);

  return (
    '#' +
    parts
      .slice(0, 3)
      .map(part =>
        Math.max(0, Math.min(255, Math.round(Number(part))))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

/**
 * The theme itself is baked into the document — it is the same two files
 * whatever the palette says. What travels is the name of the one in force and
 * the handful of colours the app, not the theme, is entitled to: chrome that
 * belongs to the surrounding panel rather than to the code.
 */
export function monacoTheme(colors, scheme) {
  const dark = scheme === 'dark';
  const theme = dark ? ONE_DARK : ONE_LIGHT;
  const surface = toHex(colors.surface ?? (dark ? '#111318' : '#ffffff'));
  const muted = toHex(colors.outline ?? (dark ? '#8e9099' : '#74777f'));

  return {
    name: theme.name,
    colors: {
      'editorLineNumber.foreground': muted,
      // Popups are the app's chrome and have to be readable off the blur, so
      // they take its surface rather than the theme's.
      'editorWidget.background': surface,
      'editorSuggestWidget.background': surface,
      'editorHoverWidget.background': surface,
    },
  };
}
