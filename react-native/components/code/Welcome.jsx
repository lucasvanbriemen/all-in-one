import {IconButton, SmallButton} from './ui';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles, withAlpha} from '../theme';

import React from 'react';
import {formatKeybinding} from './keymap';

/** The Code page before a folder is open: open one, or go back to a recent one. */
export function Welcome({recentProjects = [], onOpenFolder, onOpenRecent, onForgetRecent, keybindings}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrapper} testID="welcome">
      <Text style={styles.title}>No project open</Text>
      <Text style={styles.subtitle}>Open a folder to start editing. {keybindings?.openFolder ? formatKeybinding(keybindings.openFolder) : ''}</Text>

      <SmallButton title="Open folder…" tone="accent" onPress={onOpenFolder} style={styles.open} testID="welcome-open" />

      {recentProjects.length > 0 && (
        <View style={styles.recent}>
          <Text style={styles.recentTitle}>Recent</Text>
          {recentProjects.map(path => (
            <Pressable key={path} onPress={() => onOpenRecent(path)} style={styles.recentRow} testID={`recent-${path}`}>
              <View style={{flex: 1}}>
                <Text style={styles.recentName}>{path.split('/').filter(Boolean).pop()}</Text>
                <Text style={styles.recentPath} numberOfLines={1}>{path}</Text>
              </View>
              <IconButton glyph="×" label="Remove from recent" onPress={() => onForgetRecent(path)} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 28,
    color: colors.onSurfaceVariant,
    fontWeight: 'bold',
    opacity: 0.85,
  },
  subtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  open: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  warning: {
    marginTop: 12,
    color: '#f85149',
    fontSize: 12.5,
    textAlign: 'center',
    maxWidth: 420,
  },
  recent: {
    marginTop: 24,
    width: 420,
    maxWidth: '100%',
    padding: 10,
    borderRadius: 14,
    ...glass(colors, {variant: 'subtle'}),
  },
  recentTitle: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  recentName: {
    color: colors.onSurface,
    fontSize: 13.5,
    fontWeight: '600',
  },
  recentPath: {
    color: withAlpha(colors.onSurfaceVariant, 0.9),
    fontSize: 11.5,
  },
});
