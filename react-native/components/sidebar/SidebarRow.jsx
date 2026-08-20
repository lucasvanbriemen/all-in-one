import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useTheme, useThemedStyles} from '../theme';

import {SidebarIcon} from '../icons';

export function SidebarRow({icon, title, isSelected, onPress, useLabels = true}) {
  const styles = useThemedStyles(createStyles);
  const {onPrimary, onSurface} = useTheme();

  return (
    <Pressable onPress={onPress} style={[styles.row, isSelected && styles.selectedRow, !useLabels && styles.rowMinimized]}>
      <SidebarIcon name={icon} size={16} color={isSelected ? onPrimary : onSurface} />
      {useLabels && (
        <Text style={[styles.label, isSelected && styles.labelSelected]}>
          {title}
        </Text>
      )}
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
  },
  rowMinimized: {
    padding: 8,
    paddingTop: 16,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  selectedRow: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 14,
    color: colors.onSurface,
  },
  labelSelected: {
    color: colors.onPrimary,
  },
});
