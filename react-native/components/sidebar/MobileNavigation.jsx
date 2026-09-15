import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { glass, useThemedStyles } from '../theme';

import {NavigationBlur} from './NavigationBlur';
import { api } from '../api';
import { useAppContext } from '../../context/AppContext';

const title = name => name.charAt(0).toUpperCase() + name.slice(1);

export function MobileNavigation() {
  const { set, get } = useAppContext();

  const styles = useThemedStyles(createStyles);
  const [config, setConfig] = useState({});
  useEffect(() => {
    api.get('/meta_data').then(data => {
      setConfig(data.config ?? {});
    })
  }, []);

  const activeApp = get('app.activeApp') || "home";
  const activeItem = useMemo(() => config[activeApp] ?? [], [config, activeApp]);
  useEffect(() => {
    if (activeItem.length && !activeItem.some(row => row.path === get('app.activeSidebarItem'))) {
      set('app.activeSidebarItem', activeItem[0].path);
    }
  }, [activeItem, get, set]);

  return (
    <View style={[styles.navigation, styles.blurredNavigation]}>
      {NavigationBlur != null && <NavigationBlur pointerEvents="none" style={StyleSheet.absoluteFill} />}
      <ScrollView horizontal contentContainerStyle={styles.sections}>
        {activeItem.map(row => (
          <Pressable key={row.path} onPress={() => set('app.activeSidebarItem', row.path)} style={[styles.section, row.path === get('app.activeSidebarItem') && styles.selected]}>
            <Text style={[ styles.sectionText, row.path === get('app.activeSidebarItem') && styles.selectedText, ]}>
              {row.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.tabs}>
        {config && Object.keys(config).map(app => (
          <Pressable key={app} onPress={() => {set('app.activeSidebarItem', config[app]?.[0]?.path ?? null); set('app.activeApp', app);}} style={[styles.tab, app === get('app.activeApp') && styles.selected]}>
            <Text style={[styles.tabText, app === get('app.activeApp') && styles.selectedText]}> {title(app)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  navigation: {
    ...glass(colors, { variant: 'subtle' }),
    borderRadius: 48,
    padding: 16,
    gap: 6,
  },
  sections: { gap: 6 },
  blurredNavigation: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'hidden',
  },
  section: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 48,
  },
  sectionText: { color: colors.onSurfaceVariant, fontSize: 14 },
  tabs: { flexDirection: 'row', gap: 4 },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 48,
    paddingHorizontal: 4,
  },
  tabText: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
  },
  selected: { ...glass(colors, { variant: 'accent' }) },
  selectedText: { color: colors.onPrimary },
});
