import {toHex} from '../monacoTheme';
import {withAlpha} from '../theme';

/**
 * xterm.js, and what the shell's sixteen colours are.
 *
 * Same shape as `monacoTheme`: the CDN the WebView loads the terminal from, and
 * one function that turns the app's palette into the theme it takes.
 */
export const XTERM_VERSION = '5.5.0';
export const XTERM_CDN = `https://cdn.jsdelivr.net/npm/@xterm/xterm@${XTERM_VERSION}`;

export const XTERM_FIT_VERSION = '0.10.0';
export const XTERM_FIT_CDN = `https://cdn.jsdelivr.net/npm/@xterm/addon-fit@${XTERM_FIT_VERSION}`;

export const TERMINAL_OPTIONS = {
  // The panel is glass over the window's blur, so the terminal has to be
  // allowed not to paint its own background. Without this xterm fills every
  // cell with the theme's background colour whatever its alpha says.
  allowTransparency: true,
  fontFamily: 'Menlo, Monaco, "SF Mono", monospace',
  fontSize: 13,
  lineHeight: 1.3,
  cursorBlink: true,
  scrollback: 5000,
  // A shell that clears the screen should not leave the old screen in the
  // scrollback for the user to scroll back into.
  altClickMovesCursor: false,
};

/**
 * The ANSI sixteen, from the same two themes the editor is using — the theme
 * files themselves carry no `terminal.ansi*` block, so these are Atom's
 * originals, which is where One Dark and One Light both come from. Fixed
 * rather than palette-derived: a shell asking for red means red.
 */
const ANSI = {
  dark: {
    black: '#3f4451',
    red: '#e05561',
    green: '#8cc265',
    yellow: '#d18f52',
    blue: '#4aa5f0',
    magenta: '#c162de',
    cyan: '#42b3c2',
    white: '#d7dae0',
    brightBlack: '#4f5666',
    brightRed: '#ff616e',
    brightGreen: '#a5e075',
    brightYellow: '#f0a45d',
    brightBlue: '#4dc4ff',
    brightMagenta: '#de73ff',
    brightCyan: '#4cd1e0',
    brightWhite: '#e6e6e6',
  },
  light: {
    black: '#383a42',
    red: '#e45649',
    green: '#50a14f',
    yellow: '#c18401',
    blue: '#4078f2',
    magenta: '#a626a4',
    cyan: '#0184bc',
    white: '#a0a1a7',
    brightBlack: '#4f525e',
    brightRed: '#e06c75',
    brightGreen: '#98c379',
    brightYellow: '#e5c07b',
    brightBlue: '#61afef',
    brightMagenta: '#c678dd',
    brightCyan: '#56b6c2',
    brightWhite: '#ffffff',
  },
};

/** xterm parses `#rgb`, `#rrggbb(aa)` and comma-form `rgb()` — nothing else. */
const TRANSPARENT = '#00000000';

/**
 * `useTheme()` is empty until the palette lands, and a terminal has to be
 * legible on its first frame. Written in the palette's own notation rather
 * than as hex, because `withAlpha` takes these apart by their numbers.
 */
const FALLBACK = {
  dark: {onSurface: 'rgb(226 226 233)', primary: 'rgb(170 199 255)', onPrimary: 'rgb(11 48 95)', outline: 'rgb(142 144 153)'},
  light: {onSurface: 'rgb(25 28 32)', primary: 'rgb(65 94 145)', onPrimary: 'rgb(255 255 255)', outline: 'rgb(116 119 127)'},
};

export function terminalTheme(colors, scheme) {
  const dark = scheme === 'dark';
  const fallback = FALLBACK[dark ? 'dark' : 'light'];

  const text = colors.onSurface ?? fallback.onSurface;
  const accent = colors.primary ?? fallback.primary;
  const muted = colors.outline ?? fallback.outline;

  return {
    ...ANSI[dark ? 'dark' : 'light'],
    background: TRANSPARENT,
    foreground: toHex(text),
    cursor: toHex(accent),
    cursorAccent: toHex(colors.onPrimary ?? fallback.onPrimary),
    // Translucent, so selected text keeps the colour the shell asked for
    // instead of being covered over by the highlight.
    selectionBackground: withAlpha(accent, 0.3),
    selectionInactiveBackground: withAlpha(muted, 0.2),
  };
}
