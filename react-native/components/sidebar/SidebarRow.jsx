import {Pressable, StyleSheet, Text} from 'react-native';
import {useAppContext} from '../../context/AppContext';

import {Icon} from '../icons';

function isSelected(row, get, app) {
  return get("app.activeSidebarItem") === row.path && get("app.activeApp") === app;
}

function onPress(row, set, app) {
  set('app.activeSidebarItem', row.path);
  set('app.activeApp', app);
}

export function SidebarRow({row, app}) {
  const styles = createStyles();
  const {get, set} = useAppContext();

  return (
    <Pressable onPress={() => onPress(row, set, app)} style={[styles.row, isSelected(row, get, app) && styles.selectedRow]}>
      <Icon name={row.path} size={16} color={isSelected(row, get, app) ? "red" : "red"} />
      <Text numberOfLines={1} style={[styles.label, isSelected(row, get, app) && styles.labelSelected]}>
        {row.name}
      </Text>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  row: {
    padding: 16,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
  },
  selectedRow: {
  },
  label: {
    fontSize: 14,
    flexShrink: 0,
  },
  labelSelected: {
  },
});
