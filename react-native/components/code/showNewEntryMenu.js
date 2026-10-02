import {NativeModules} from 'react-native';

const CREATE_ACTIONS = [
  {title: 'New file', kind: 'file'},
  {title: 'New folder', kind: 'folder'},
];

const ENTRY_ACTIONS = [
  {title: 'Rename', kind: 'rename'},
  {title: 'Delete', kind: 'delete'},
];

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
