import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {accentColor, labelColor} from './theme';

import {api} from './api';

export function Sidebar({selection, onSelect}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    api
      .get('/meta_data')
      .then(data => {
        setItems(data.config.sidebar);
      })
  }, []);

  return (
    <View style={[styles.sidebar, isMinimized && styles.sidebarMinimized]} contentContainerStyle={styles.sidebarContent}>
      <Pressable onPress={() => setIsMinimized(!isMinimized)} style={styles.row}>
        <Text style={styles.label}>{isMinimized ? 'Open' : 'Close'}</Text>
      </Pressable>

      {items.map(item => (
        <SidebarRow key={item.title} title={item.title} isSelected={selection === item.title} onPress={() => onSelect(item.title)} />
      ))}
    </View>
  );
}

function SidebarRow({title, isSelected, onPress}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      {/* SwiftUI's `.fill(accent.opacity(0.18))` — a tinted plate behind the
          label, rather than a faded label. */}
      {isSelected && <View style={styles.selectedFill} pointerEvents="none" />}
      <Text style={[styles.label, isSelected && styles.labelSelected]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: 'transparent',
  },
  sidebarMinimized: {
    width: 100,
  },
  sidebarContent: {
    padding: 8,
  },
  // The whole row is the hit target, including the padding — Pressable already
  // behaves this way, so no `.contentShape(Rectangle())` equivalent is needed.
  row: {
    padding: 16,
    justifyContent: 'center',
  },
  selectedFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    opacity: 0.18,
    backgroundColor: accentColor,
  },
  label: {
    fontSize: 13,
    color: labelColor,
  },
  labelSelected: {
    color: accentColor,
  },
});
