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

export function monacoTheme(colors, scheme) {
  const dark = scheme === 'dark';
  const surface = toHex(colors.surface ?? (dark ? '#111318' : '#ffffff'));
  const foreground = toHex(colors.onSurface ?? (dark ? '#e2e2e9' : '#1b1b1f'));
  const muted = toHex(colors.outline ?? (dark ? '#8e9099' : '#74777f'));

  return {
    base: dark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [],
    colors: {
      // Monaco inherits VS Code's chrome, which rings the focused editor in
      // `#007fd4`. There is no surrounding IDE here for that ring to belong
      // to — the panel's own border is the edge.
      focusBorder: TRANSPARENT,
      contrastBorder: TRANSPARENT,
      contrastActiveBorder: TRANSPARENT,
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
