import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {accentColor, labelColor} from './theme';

import React from 'react';

export function Sidebar({items, selection, onSelect}) {
  return (
    <ScrollView
      style={styles.sidebar}
      contentContainerStyle={styles.sidebarContent}>
      {items.map(item => (
        <SidebarRow
          key={item}
          title={item}
          isSelected={selection === item}
          onPress={() => onSelect(item)}
        />
      ))}
    </ScrollView>
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
    // RCTScrollView paints its own backdrop on macOS, which would sit on top
    // of the material and cancel out the blur.
    backgroundColor: 'transparent',
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
