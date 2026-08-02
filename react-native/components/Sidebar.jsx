import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {useTheme, useThemedStyles} from './theme';

import {SidebarIcon} from './icons';
import {api} from './api';

export function Sidebar({selection, onSelect}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [items, setItems] = useState([]);
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    api
      .get('/meta_data')
      .then(data => {
        setItems(data.config.email);
      })
  }, []);

  return (
    <View style={[styles.sidebar, isMinimized && styles.sidebarMinimized]} contentContainerStyle={styles.sidebarContent}>
      <Pressable onPress={() => setIsMinimized(!isMinimized)} style={styles.row}>
        <Text style={styles.label}>{isMinimized ? 'Open' : 'Close'}</Text>
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
  },
  sidebarMinimized: {
    width: 100,
  },
  row: {
    padding: 16,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowMinimized: {
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
