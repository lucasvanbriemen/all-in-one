import {Pressable, StyleSheet, Text} from 'react-native';
import {useTheme, useThemedStyles} from '../theme';
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
  const styles = useThemedStyles(createStyles);
  const {onPrimary, onSurface} = useTheme();
  const {get, set} = useAppContext();

  return (
    <Pressable onPress={() => onPress(row, set, app)} style={[styles.row, isSelected(row, get, app) && styles.selectedRow]}>
      <Icon name={row.path} size={16} color={isSelected(row, get, app) ? onPrimary : onSurface} />
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
    borderColor: 'transparent',
  },
  selectedRow: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  label: {
    fontSize: 14,
    color: colors.onSurface,
    flexShrink: 0,
  },
  labelSelected: {
    color: colors.onPrimaryContainer
  },
});
