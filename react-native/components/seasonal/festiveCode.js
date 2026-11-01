/**
 * Christmas versions of the editor and terminal themes.
 *
 * Rather than a hand-written theme, the One Dark / One Light token colours are
 * re-mapped by hue: reds and purples (keywords, tags) go cranberry, yellows
 * and oranges (types, numbers) gold, greens (strings) pine, blues and cyans
 * (functions) frost. Greys — comments, punctuation — are left alone, so the
 * code stays as readable as it was.
 */
const FESTIVE = {
  dark: {red: '#ff5c6c', gold: '#f6c445', green: '#5fd38d', frost: '#9fd8ff', cursor: '#ff3b3b', selection: '#f6c44533'},
  light: {red: '#c1121f', gold: '#a87400', green: '#1b7a3d', frost: '#2b6c9e', cursor: '#c1121f', selection: '#f6c44540'},
};

function toHsl(hex) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return {h: 0, s: 0, l};
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return {h: (h * 60 + 360) % 360, s, l};
}

function remap(color, palette) {
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}/i.test(color)) return color;
  const alpha = color.length === 9 ? color.slice(7) : '';
  const {h, s} = toHsl(color);
  if (s < 0.2) return color;
  if (h < 20 || h >= 270) return palette.red + alpha;
  if (h < 70) return palette.gold + alpha;
  if (h < 165) return palette.green + alpha;
  return palette.frost + alpha;
}

export function festiveMonacoTheme(theme, type) {
  const palette = FESTIVE[type];
  return {
    ...theme,
    name: `${theme.name} Christmas`,
    tokenColors: theme.tokenColors.map(rule =>
      rule.settings?.foreground ? {...rule, settings: {...rule.settings, foreground: remap(rule.settings.foreground, palette)}} : rule,
    ),
    colors: {
      ...theme.colors,
      'editorCursor.foreground': palette.cursor,
      'editor.selectionBackground': palette.selection,
    },
  };
}

/** Candy-cane cursor and a gold selection; the shell's own colours stay as asked. */
export function festiveTerminalColors(type) {
  const palette = FESTIVE[type];
  return {cursor: palette.cursor, selectionBackground: palette.selection};
}
