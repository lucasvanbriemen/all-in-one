import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles, withAlpha} from '../theme';

import {Icon} from '../icons';
import {parentOf, useFileTree} from './fileTreeContext';
import {useState} from 'react';

const ITEM_HEIGHT = 30;
const MENU_WIDTH = 190;

/**
 * Where new entries made from a menu go: inside a folder, beside a file — which
 * is the same thing said about its parent — and at the top level for the empty
 * space below the rows, which stands for the project itself.
 */
function parentForNewEntries(entry) {
  if (!entry) {
    return '';
  }

  return entry.isDirectory ? entry.fullPath : parentOf(entry.fullPath);
}

/**
 * How tall the menu will be, so the tree can keep it inside the panel before
 * it is drawn. The project root has nothing to rename or delete, so its menu
 * is two items rather than four.
 */
export function rowMenuSize(entry) {
  return {width: MENU_WIDTH, height: ITEM_HEIGHT * (entry ? 4 : 2) + 8};
}

/**
 * The tree's context menu, opened by a secondary click on a row or on the
 * space below them — and by a long press, for anyone without a second button.
 *
 * Positioned by the tree, which is the only thing that knows where its own
 * panel starts; the menu itself is handed coordinates it can use.
 */
export function RowMenu({left, top}) {
  const styles = useThemedStyles(createStyles);
  const {menu, closeMenu, startCreate, startRename, requestDelete} = useFileTree();

  const entry = menu.entry;
  const parent = parentForNewEntries(entry);

  const items = [
    {label: 'New file', icon: 'new-file', onPress: () => startCreate(parent, 'file')},
    {label: 'New folder', icon: 'new-folder', onPress: () => startCreate(parent, 'directory')},
  ];

  if (entry) {
    items.push(
      {label: 'Rename', icon: 'rename', onPress: () => startRename(entry)},
      {label: 'Delete', icon: 'trash', onPress: () => requestDelete(entry), destructive: true},
    );
  }

  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />

      <View style={[styles.menu, {left, top}]}>
        {items.map(item => (
          <MenuItem key={item.label} {...item} />
        ))}
      </View>
    </>
  );
}

function MenuItem({label, icon, onPress, destructive}) {
  const styles = useThemedStyles(createStyles);
  const [hovered, setHovered] = useState(false);

  const color = destructive ? styles.destructive.color : styles.label.color;

  return (
    <Pressable
      style={[styles.item, hovered && styles.itemHovered]}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}>
      <Icon name={icon} size={16} color={color} />

      <Text style={[styles.label, destructive && styles.destructive]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    padding: 4,
    borderRadius: 10,
    ...glass(colors, {tint: 0.95}),
    backgroundColor: colors.surfaceAt2,
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: ITEM_HEIGHT,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  itemHovered: {
    backgroundColor: withAlpha(colors.onSurface, 0.08),
  },
  label: {
    color: colors.onSurface,
  },
  destructive: {
    color: colors.error,
  },
});
