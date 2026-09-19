import {
  DEFAULT_KEYBINDINGS,
  buildKeymap,
  commandForEvent,
  formatKeybinding,
  keyDownEventsFor,
  matchesBinding,
  parseKeybinding,
} from '../components/code/keymap';

test('parses modifiers in any order and aliases', () => {
  expect(parseKeybinding('shift+cmd+P')).toEqual({key: 'p', meta: true, ctrl: false, alt: false, shift: true});
  expect(parseKeybinding('ctrl+`')).toEqual({key: '`', meta: false, ctrl: true, alt: false, shift: false});
  expect(parseKeybinding('cmd+\\')).toMatchObject({key: '\\', meta: true});
  expect(parseKeybinding('esc')).toMatchObject({key: 'escape'});
  expect(parseKeybinding('cmd++')).toMatchObject({key: '+', meta: true});
  expect(parseKeybinding('cmd+p+q')).toBeNull();
  expect(parseKeybinding('')).toBeNull();
  expect(parseKeybinding('cmd')).toBeNull();
});

test('matches native and web shaped events', () => {
  const binding = parseKeybinding('cmd+shift+p');
  expect(matchesBinding(binding, {nativeEvent: {key: 'p', metaKey: true, shiftKey: true}})).toBe(true);
  expect(matchesBinding(binding, {key: 'P', metaKey: true, shiftKey: true, code: 'KeyP'})).toBe(true);
  expect(matchesBinding(binding, {key: 'p', metaKey: true})).toBe(false);
  expect(matchesBinding(binding, {key: 'p', ctrlKey: true, shiftKey: true})).toBe(false);
});

test('shifted digits resolve through the key code', () => {
  const binding = parseKeybinding('cmd+shift+2');
  expect(matchesBinding(binding, {key: '@', code: 'Digit2', metaKey: true, shiftKey: true})).toBe(true);
});

test('user overrides replace defaults and an empty string unbinds', () => {
  const keymap = buildKeymap({quickOpen: 'cmd+o', openFolder: ''});
  expect(commandForEvent(keymap, {key: 'o', metaKey: true})).toBe('quickOpen');
  expect(commandForEvent(keymap, {key: 'p', metaKey: true})).toBeNull();
  expect(keymap.some(entry => entry.command === 'openFolder')).toBe(false);
});

test('every default binding parses', () => {
  const keymap = buildKeymap();
  expect(keymap).toHaveLength(Object.keys(DEFAULT_KEYBINDINGS).length);
});

test('keyDownEvents mirror the keymap in AppKit shape', () => {
  const events = keyDownEventsFor(buildKeymap({only: 'cmd+shift+escape'}));
  expect(events).toContainEqual({key: 'Escape', metaKey: true, ctrlKey: false, altKey: false, shiftKey: true});
});

test('formats with macOS glyphs', () => {
  expect(formatKeybinding('cmd+shift+p')).toBe('⇧⌘P');
  expect(formatKeybinding('ctrl+tab')).toBe('⌃⇥');
  expect(formatKeybinding('nonsense+x+y')).toBe('');
});
