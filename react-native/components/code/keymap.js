/**
 * Keyboard shortcuts, as data.
 *
 * A binding is `"cmd+shift+p"`: modifiers in any order, then one key. They
 * follow VS Code where the app has the same command.
 */
export const KEYBINDINGS = {
  quickOpen: 'cmd+p',
  commandPalette: 'cmd+shift+p',
  goToSymbol: 'cmd+shift+o',
  goToLine: 'ctrl+g',
  save: 'cmd+s',
  saveAll: 'cmd+alt+s',
  closeTab: 'cmd+w',
  closeAllTabs: 'cmd+shift+w',
  reopenClosedTab: 'cmd+shift+t',
  nextTab: 'ctrl+tab',
  previousTab: 'ctrl+shift+tab',
  nextTabAlt: 'cmd+shift+]',
  previousTabAlt: 'cmd+shift+[',
  splitEditor: 'cmd+\\',
  focusFirstGroup: 'cmd+1',
  focusSecondGroup: 'cmd+2',
  toggleSidebar: 'cmd+b',
  toggleTerminal: 'cmd+j',
  newTerminal: 'ctrl+shift+`',
  showFiles: 'cmd+shift+e',
  showSearch: 'cmd+shift+f',
  showGit: 'ctrl+shift+g',
  showProblems: 'cmd+shift+m',
  openFolder: 'cmd+o',
  newFile: 'cmd+n',
  formatDocument: 'shift+alt+f',
  dismiss: 'escape',
};

/** Command ids as the command palette labels them. */
export const COMMAND_LABELS = {
  quickOpen: 'Go to file',
  commandPalette: 'Command palette',
  goToSymbol: 'Go to symbol in file',
  goToLine: 'Go to line',
  save: 'Save',
  saveAll: 'Save all',
  closeTab: 'Close tab',
  closeAllTabs: 'Close all tabs',
  reopenClosedTab: 'Reopen closed tab',
  nextTab: 'Next tab',
  previousTab: 'Previous tab',
  nextTabAlt: 'Next tab (alternate)',
  previousTabAlt: 'Previous tab (alternate)',
  splitEditor: 'Split editor',
  focusFirstGroup: 'Focus first editor group',
  focusSecondGroup: 'Focus second editor group',
  toggleSidebar: 'Toggle sidebar',
  toggleTerminal: 'Toggle terminal',
  newTerminal: 'New terminal',
  showFiles: 'Show files',
  showSearch: 'Search in files',
  showGit: 'Show source control',
  showProblems: 'Show problems',
  openFolder: 'Open folder',
  newFile: 'New file',
  formatDocument: 'Format document',
  dismiss: 'Dismiss / close overlay',
};

const MODIFIERS = {
  cmd: 'meta',
  command: 'meta',
  meta: 'meta',
  ctrl: 'ctrl',
  control: 'ctrl',
  alt: 'alt',
  option: 'alt',
  opt: 'alt',
  shift: 'shift',
};

/** Names the OS spells one way and the web another. */
const KEY_ALIASES = {
  esc: 'escape',
  return: 'enter',
  space: ' ',
  spacebar: ' ',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  plus: '=',
  backtick: '`',
  del: 'delete',
};

export function parseKeybinding(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const parts = text
    .trim()
    .toLowerCase()
    .split('+')
    .map(part => part.trim());

  // `cmd++` is cmd and the plus key: an empty part means a literal `+`.
  // `cmd++` splits to ['cmd', '', ''] — the run of empties is the one key.
  const normalised = [];
  for (let index = 0; index < parts.length; index++) {
    if (parts[index] === '') {
      if (index > 0 && parts[index - 1] !== '') {
        normalised.push('+');
      }
    } else {
      normalised.push(parts[index]);
    }
  }

  const binding = {key: null, meta: false, ctrl: false, alt: false, shift: false};

  for (const part of normalised) {
    const modifier = MODIFIERS[part];

    if (modifier) {
      binding[modifier] = true;
      continue;
    }

    if (binding.key !== null) {
      return null;
    }

    binding.key = KEY_ALIASES[part] ?? part;
  }

  return binding.key === null ? null : binding;
}

/** A key event from any of the three places one can arrive from. */
export function normaliseKeyEvent(event) {
  const source = event?.nativeEvent ?? event ?? {};
  const rawKey = source.key ?? '';
  let key = String(rawKey).toLowerCase();

  // Shift+2 arrives as `@` on the web and as `2` from AppKit; a binding is
  // written against the unshifted key, so both have to land on it.
  if (source.code && /^(Key|Digit)/.test(source.code) && key.length === 1) {
    key = source.code.replace(/^Key|^Digit/, '').toLowerCase();
  }

  key = KEY_ALIASES[key] ?? key;

  return {
    key,
    meta: Boolean(source.metaKey),
    ctrl: Boolean(source.ctrlKey),
    alt: Boolean(source.altKey),
    shift: Boolean(source.shiftKey),
  };
}

export function matchesBinding(binding, event) {
  if (!binding) {
    return false;
  }

  const pressed = normaliseKeyEvent(event);

  return (
    pressed.key === binding.key &&
    pressed.meta === binding.meta &&
    pressed.ctrl === binding.ctrl &&
    pressed.alt === binding.alt &&
    pressed.shift === binding.shift
  );
}

/**
 * The user's bindings over the defaults, parsed once. Returned as a list so
 * lookup is a scan — there are a few dozen, and it runs once per key.
 */
export function buildKeymap() {
  return Object.entries(KEYBINDINGS)
    .map(([command, text]) => ({command, text, binding: parseKeybinding(text)}))
    .filter(entry => entry.binding);
}

export function commandForEvent(keymap, event) {
  const entry = keymap.find(candidate => matchesBinding(candidate.binding, event));
  return entry ? entry.command : null;
}

/**
 * The bindings as the pieces of the app that see key events need them: the
 * `keyDownEvents` list that tells AppKit which keys are ours, and the same
 * list for the two WebViews to intercept and hand back.
 */
export function keyDownEventsFor(keymap) {
  return keymap.map(({binding}) => ({
    key: displayKey(binding.key),
    metaKey: binding.meta,
    ctrlKey: binding.ctrl,
    altKey: binding.alt,
    shiftKey: binding.shift,
  }));
}

/** The key as a DOM `KeyboardEvent.key` spells it. */
function displayKey(key) {
  const names = {
    escape: 'Escape',
    enter: 'Enter',
    tab: 'Tab',
    arrowup: 'ArrowUp',
    arrowdown: 'ArrowDown',
    arrowleft: 'ArrowLeft',
    arrowright: 'ArrowRight',
    backspace: 'Backspace',
    delete: 'Delete',
  };

  return names[key] ?? key;
}

/** `cmd+shift+p` -> `⌘⇧P`, for menus and the palette. */
export function formatKeybinding(text) {
  const binding = parseKeybinding(text);

  if (!binding) {
    return '';
  }

  const glyphs = {
    escape: '⎋', enter: '↩', tab: '⇥', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→',
    backspace: '⌫', delete: '⌦', ' ': '␣',
  };

  return [
    binding.ctrl ? '⌃' : '',
    binding.alt ? '⌥' : '',
    binding.shift ? '⇧' : '',
    binding.meta ? '⌘' : '',
    glyphs[binding.key] ?? binding.key.toUpperCase(),
  ].join('');
}
