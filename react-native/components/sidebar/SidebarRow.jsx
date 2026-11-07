import {Pressable, StyleSheet, Text} from 'react-native';
import {useTheme, useThemedStyles} from '../theme';

import {Icon} from '../icons';

export function SidebarRow({icon, title, isSelected, onPress}) {
  const styles = useThemedStyles(createStyles);
  const {onPrimary, onSurface} = useTheme();

  return (
    <Pressable onPress={onPress} style={[styles.row, isSelected && styles.selectedRow]}>
      <Icon name={icon} size={16} color={isSelected ? onPrimary : onSurface} />
      <Text numberOfLines={1} style={[styles.label, isSelected && styles.labelSelected]}>
        {title}
      </Text>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  row: {
    paddingVertical: 16,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedRow: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 14,
    color: colors.onSurface,
    flexShrink: 0,
  },
  labelSelected: {
    color: colors.onPrimary,
  },
});
