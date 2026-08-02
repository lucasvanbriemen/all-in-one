import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {SidebarIcon} from './icons';
import {useTheme} from './theme';
import {api} from './api';

export function Sidebar({selection, onSelect}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [items, setItems] = useState([]);
  const {onSurface} = useTheme();

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
        <Text style={[styles.label, {color: onSurface}]}>
          {isMinimized ? 'Open' : 'Close'}
        </Text>
      </Pressable>

      {items.map(item => (
        <SidebarRow key={item.path} icon={item.path} title={item.name} isSelected={selection === item.path} onPress={() => onSelect(item.path)} useLabels={!isMinimized} />
      ))}
    </View>
  );
}

function SidebarRow({icon, title, isSelected, onPress, useLabels = true}) {
  const {primary, onPrimary, onSurface} = useTheme();
  const foreground = isSelected ? onPrimary : onSurface;

  return (
    <Pressable onPress={onPress} style={[styles.row, isSelected && {backgroundColor: primary}, !useLabels && styles.rowMinimized]}>
      <SidebarIcon
        name={icon}
        size={16}
        color={foreground}
      />
      {useLabels && (
        <Text style={[styles.label, {color: foreground}]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  label: {
    fontSize: 14,
  },
});
