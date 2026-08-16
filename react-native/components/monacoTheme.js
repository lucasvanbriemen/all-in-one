export const MONACO_VERSION = '0.52.2';
export const MONACO_CDN = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min`;

/** Monaco takes `#rrggbbaa`, so a surface can opt out of painting entirely. */
const TRANSPARENT = '#00000000';

export const EDITOR_OPTIONS = {
  automaticLayout: true,
  minimap: {enabled: true},
  scrollBeyondLastLine: false,
  fontSize: 14,
  padding: {top: 12, bottom: 12},
};

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
 * Builds a Monaco theme from the shared palette.
 *
 * The editing surfaces are fully transparent so the window's blur reaches the
 * text: Monaco paints an opaque `editor.background` by default, and an opaque
 * fill this large is enough on its own to make the whole window read as solid.
 * Monaco accepts `#rrggbbaa`, so the panel behind it does the tinting.
 *
 * Floating widgets — find, suggest, hover — keep an opaque fill, since they
 * overlap the code and have to stay readable.
 *
 * Every colour has a fallback: `useTheme()` is empty until the palette fetch
 * lands, and Monaco rejects a theme with an undefined value in it.
 */
export function monacoTheme(colors, scheme) {
  const dark = scheme === 'dark';
  const surface = toHex(colors.surface);
  const foreground = toHex(colors.onSurface);
  const muted = toHex(colors.outline);

  return {
    base: dark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': TRANSPARENT,
      'editor.foreground': foreground,
      'editorGutter.background': TRANSPARENT,
      'minimap.background': TRANSPARENT,
      'editorOverviewRuler.background': TRANSPARENT,
      'editorLineNumber.foreground': muted,
      'editorWidget.background': surface,
      'editorSuggestWidget.background': surface,
      'editorHoverWidget.background': surface,
    },
  };
}
