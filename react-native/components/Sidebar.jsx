import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {accentColor, labelColor} from './theme';

import {SidebarIcon} from './icons';
import {api} from './api';

export function Sidebar({selection, onSelect}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [items, setItems] = useState([]);

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
  return (
    <Pressable onPress={onPress} style={styles.row}>
      {/* SwiftUI's `.fill(accent.opacity(0.18))` — a tinted plate behind the
          label, rather than a faded label. */}
      {isSelected && <View style={styles.selectedFill} pointerEvents="none" />}
      <SidebarIcon
        name={icon}
        size={16}
        color={isSelected ? "#fff" : labelColor}
      />
      {useLabels && (
        <Text style={[styles.label, isSelected && styles.labelSelected]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: 'transparent',
    padding: 16,
  },
  sidebarMinimized: {
    width: 100,
  },
  row: {
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 100,
    opacity: 0.5,
    backgroundColor: accentColor,
  },
  label: {
    fontSize: 14,
    color: labelColor,
  },
  labelSelected: {
    color: "#fff",
  },
});
