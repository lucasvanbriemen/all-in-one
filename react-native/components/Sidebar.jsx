import {LogoIcon, SidebarIcon} from './icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useTheme, useThemedStyles} from './theme';

import {api} from './api';

export function Sidebar({selection, onSelect}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [items, setItems] = useState([]);
  const styles = useThemedStyles(createStyles);
  const {primary} = useTheme();

  useEffect(() => {
    api
      .get('/meta_data')
      .then(data => {
        setItems(data.config.email);
      })
  }, []);

  return (
    <View style={[styles.sidebar, isMinimized && styles.sidebarMinimized]} contentContainerStyle={styles.sidebarContent}>
      {/* The mark doubles as the collapse control, so the sidebar keeps its
          identity in both widths without spending a row on a toggle. */}
      <Pressable
        onPress={() => setIsMinimized(!isMinimized)}
        accessibilityRole="button"
        accessibilityLabel={isMinimized ? 'Open sidebar' : 'Close sidebar'}
        style={[styles.row, isMinimized && styles.rowMinimized]}>
        <LogoIcon size={24} color={primary} />
      </Pressable>

      {items.map(item => (
        <SidebarRow key={item.path} icon={item.path} title={item.name} isSelected={selection === item.path} onPress={() => onSelect(item.path)} useLabels={!isMinimized} />
      ))}
    </View>
  );
}

function SidebarRow({icon, title, isSelected, onPress, useLabels = true}) {
  const styles = useThemedStyles(createStyles);
  const {onPrimary, onSurface} = useTheme();

  return (
    <Pressable onPress={onPress} style={[styles.row, isSelected && styles.selectedRow, !useLabels && styles.rowMinimized]}>
      <SidebarIcon
        name={icon}
        size={16}
        color={isSelected ? onPrimary : onSurface}
      />
      {useLabels && (
        <Text style={[styles.label, isSelected && styles.labelSelected]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  sidebar: {
    width: 240,
    padding: 16,
    // Lighter tint than the content panels: the sidebar spans the full window
    // height, so it is the surface most responsible for the window reading as
    // translucent rather than merely decorated.
    ...glass(colors, {tint: 0.42}),
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
  },
  sidebarMinimized: {
    width: 60,
    padding: 8,
    paddingTop: 16,
    paddingBottom: 16,
  },
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
