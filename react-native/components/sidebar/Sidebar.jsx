import {LogoIcon, SidebarIcon} from '../icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useTheme, useThemedStyles} from '../theme';

import {SidebarRow} from './SidebarRow';
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

      {Object.entries(items).map(([app, groups]) => (
        <React.Fragment key={app}>
          <Text style={styles.appLabel}>{app}</Text>
          {groups.map(group => (
            <SidebarRow key={`${app}-${group.path}`} icon={group.path} title={group.name} isSelected={currentlyActive === app && selection === group.path} onPress={() => {onSelect(group.path); setActiveApp(app)}} useLabels={!isMinimized} />
          ))}
        </React.Fragment>
      ))}
    </View>
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
