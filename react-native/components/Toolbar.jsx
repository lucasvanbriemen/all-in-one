import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme, useThemedStyles, withAlpha} from './theme';

import {Icon} from './icons';
import {useAppContext} from '../context/AppContext';

/**
 * Slim header along the top of the content card, where a Mac app keeps its
 * toolbar. Pages carry their own titles, so it only holds window-wide
 * actions, right-aligned.
 */
export function Toolbar() {
  const styles = useThemedStyles(createStyles);
  const {onSurfaceVariant} = useTheme();
  const {set} = useAppContext();

  return (
    <View style={styles.toolbar}>
      <Pressable
        onPress={() => set('app.showSearch', true)}
        accessibilityLabel="Search"
        style={({pressed}) => [styles.search, pressed && styles.searchPressed]}>
        <Icon name="search" size={14} color={onSurfaceVariant} />
        <Text style={styles.searchLabel}>Search</Text>
        <Text style={styles.shortcut}>⌘K</Text>
      </Pressable>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  toolbar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    minWidth: 200,
    backgroundColor: withAlpha(colors.onSurface, 0.06),
  },
  searchPressed: {
    backgroundColor: withAlpha(colors.onSurface, 0.1),
  },
  searchLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  shortcut: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
});
