import {DEFAULT_KEYBINDINGS} from './keymap';

/**
 * Everything the user can tune, with what it is until they do. Saved through
 * the file server between launches (see `handlers/state.mjs`), merged over
 * these defaults on load so a setting added later has a value.
 */
export const DEFAULT_SETTINGS = {
  fontSize: 14,
  fontFamily: '',
  tabSize: 2,
  insertSpaces: true,
  wordWrap: false,
  minimap: false,
  lineNumbers: true,
  renderWhitespace: 'selection',
  bracketPairColorization: true,
  bracketPairGuides: false,
  indentGuides: true,
  stickyScroll: false,
  formatOnSave: false,
  formatOnPaste: false,
  autoSave: true,
  autoSaveDelay: 800,
  terminalFontSize: 13,
  sidebarWidth: 260,
  terminalHeight: 260,
  showSidebar: true,
  showTerminal: true,
  keybindings: {},
};

export function mergeSettings(saved) {
  return {
    ...DEFAULT_SETTINGS,
    ...(saved ?? {}),
    keybindings: {...(saved?.keybindings ?? {})},
  };
}

export {DEFAULT_KEYBINDINGS};
