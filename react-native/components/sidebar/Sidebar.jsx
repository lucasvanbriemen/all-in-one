import {Pressable, StyleSheet, View} from 'react-native';
import {glass, useTheme, useThemedStyles} from '../theme';
import {useEffect, useState} from 'react';

import {LogoIcon} from '../icons';
import {SidebarApplication} from './SidebarApplication';
import {api} from '../api';

export function Sidebar({selection, onSelect, currentlyActive, setActiveApp}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [items, setItems] = useState([]);
  const styles = useThemedStyles(createStyles);
  const {primary} = useTheme();

  useEffect(() => {
    api
      .get('/meta_data')
      .then(data => {
        setItems(data.config);
      })
  }, []);

  return (
    <View style={[styles.sidebar, isMinimized && styles.sidebarMinimized]} contentContainerStyle={styles.sidebarContent}>
      {/* The mark doubles as the collapse control, so the sidebar keeps its
          identity in both widths without spending a row on a toggle. */}
      <Pressable onPress={() => setIsMinimized(!isMinimized)} style={[styles.row, isMinimized && styles.rowMinimized]}>
        <LogoIcon size={24} color={primary} />
      </Pressable>

      {Object.entries(items).map(([key, item]) => (
        <SidebarApplication key={key + item.app} selection={selection} onSelect={onSelect} currentlyActive={currentlyActive} setActiveApp={setActiveApp} item={item} isMinimized={isMinimized} app={key} />
      ))}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  sidebar: {
    width: 240,
    padding: 16,
    ...glass(colors, {tint: 0.25}),
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
