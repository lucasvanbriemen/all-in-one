import {NativeModules} from 'react-native';

const ACTIONS = [
  {title: 'New file', kind: 'file'},
  {title: 'New folder', kind: 'folder'},
  {title: 'rename', kind: 'rename'},
  {title: 'delete', kind: 'delete'}
];

/**
 * Right-click menu for the file tree. Resolves with 'file' or 'folder', or
 * null when the menu is dismissed. The menu itself is AppKit's, see
 * macos/AllInOne-macOS/ContextMenu.swift.
 */
export async function showNewEntryMenu() {
  const index = await NativeModules.ContextMenu.show(ACTIONS.map(({title}) => ({title})));

  return ACTIONS[index]?.kind ?? null;
}
