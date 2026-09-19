import {Badge, SEVERITY_COLORS} from './ui';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {glass, useThemedStyles, withAlpha} from '../theme';

import {Icon} from '../icons';

export const PANELS = [
  {id: 'files', label: 'Files', icon: 'files'},
  {id: 'search', label: 'Search', icon: 'search'},
  {id: 'git', label: 'Source control', icon: 'git'},
  {id: 'problems', label: 'Problems', glyph: '⚠'},
  {id: 'settings', label: 'Settings', glyph: '⚙'},
];

/** Which sidebar panel is showing; the sidebar's own rows for files and search stay in step. */
export function PanelSwitcher({panel, onSelect, badges = {}}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.bar} testID="panel-switcher">
      {PANELS.map(entry => {
        const active = entry.id === panel;
        return (
          <Pressable
            key={entry.id}
            onPress={() => onSelect(entry.id)}
            style={[styles.button, active && styles.buttonActive]}
            accessibilityLabel={entry.label}
            tooltip={entry.label}
            testID={`panel-${entry.id}`}>
            {entry.icon ? (
              <Icon name={entry.icon} size={16} color={active ? styles.activeColor.color : styles.color.color} />
            ) : (
              <Text style={[styles.glyph, active && styles.glyphActive]}>{entry.glyph}</Text>
            )}
            {badges[entry.id] ? (
              <View style={styles.badge}>
                <Badge count={badges[entry.id]} color={entry.id === 'problems' ? SEVERITY_COLORS.error : undefined} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 2,
    padding: 3,
    borderRadius: 10,
    marginTop: 16,
    ...glass(colors, {variant: 'subtle'}),
    alignSelf: 'stretch',
    justifyContent: 'space-around',
  },
  button: {
    flex: 1,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonActive: {
    backgroundColor: withAlpha(colors.primary, 0.3),
  },
  glyph: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
  },
  glyphActive: {
    color: colors.onSurface,
  },
  color: {
    color: colors.onSurfaceVariant,
  },
  activeColor: {
    color: colors.onSurface,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 2,
  },
});
