import {NativeModules} from 'react-native';

const CREATE_ACTIONS = [
  {title: 'New file', kind: 'file'},
  {title: 'New folder', kind: 'folder'},
];

const ENTRY_ACTIONS = [
  {title: 'Rename', kind: 'rename'},
  {title: 'Delete', kind: 'delete'},
];

/**
 * Right-click menu for the file tree. Resolves with the chosen action's kind
 * ('file', 'folder', 'rename' or 'delete'), or null when the menu is
 * dismissed. The menu itself is AppKit's, see
 * macos/AllInOne-macOS/ContextMenu.swift.
 *
 * Without an entry (the tree background) only the create actions show. A
 * folder gets all four; a file can only be renamed or deleted.
 */
export async function showNewEntryMenu(entry = null) {
  const actions = [];

  if (!entry || entry.isDirectory) {
    actions.push(...CREATE_ACTIONS);
  }

  if (entry) {
    actions.push(...ENTRY_ACTIONS);
  }

  const index = await NativeModules.ContextMenu.show(actions.map(({title}) => ({title})));

  return actions[index]?.kind ?? null;
}
