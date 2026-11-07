import {Animated, Pressable, StyleSheet} from 'react-native';
import {useTheme, useThemedStyles} from '../theme';

import {Icon} from '../icons';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SidebarRow({icon, title, isSelected, onPress}) {
  const styles = useThemedStyles(createStyles);
  const {onPrimary, onSurface} = useTheme();

  return (
    <AnimatedPressable onPress={onPress} style={[styles.row, isSelected && styles.selectedRow]}>
      <Icon name={icon} size={16} color={isSelected ? onPrimary : onSurface} />
      <Animated.Text numberOfLines={1} style={[styles.label, isSelected && styles.labelSelected]}>
        {title}
      </Animated.Text>
    </AnimatedPressable>
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
