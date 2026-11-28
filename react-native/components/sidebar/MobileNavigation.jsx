import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { surfaceStyle, dStyles } from '../theme';

import {NavigationBlur} from './NavigationBlur';
import { api } from '../api';
import { Icon } from '../icons';
import { useAppContext } from '../../context/AppContext';

const title = name => name.charAt(0).toUpperCase() + name.slice(1);

export function MobileNavigation() {
  const { set, get } = useAppContext();

  const currentPlatform = Platform.OS;

  const styles = createStyles();
  const [config, setConfig] = useState({});
  useEffect(() => {
    api.get('/meta_data').then(data => {

      let allApps = data.config ?? {};
      let allowedPlatformsPerApp = data.allowed_platforms ?? [];

      let filteredConfig = {};
      Object.keys(allApps).forEach(app => {
        let currentAppChecking = allowedPlatformsPerApp[app] ?? [];

        if (currentAppChecking.map(p => p.toLowerCase()).includes(currentPlatform)) {
          filteredConfig[app] = allApps[app];
        }
      });

      setConfig(filteredConfig);
    })
  }, []);

  const activeApp = get('app.activeApp') || "home";
  const appToRender = useMemo(() => config[activeApp] ?? [], [config, activeApp]);
  useEffect(() => {
    if (appToRender.length && !appToRender.some(row => row.path === get('app.activeSidebarItem'))) {
      set('app.activeSidebarItem', appToRender[0].path);
    }
  }, [appToRender, get, set]);

  return (
    <View style={styles.navigation}>
      {NavigationBlur != null && <NavigationBlur pointerEvents="none" style={StyleSheet.absoluteFill} />}

      {appToRender.length > 1 && (
        <View style={styles.sections}>
          {appToRender.map(row => (
            <Pressable key={row.path} onPress={() => set('app.activeSidebarItem', row.path)} style={[styles.tab, styles.section, row.path === get('app.activeSidebarItem') && styles.selected]}>
              <Text style={[ styles.sectionText, row.path === get('app.activeSidebarItem') && styles.selectedText, ]}>
                {row.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.appRow}>
      <ScrollView style={[styles.sections, {flex: 1}]} horizontal={true} showsHorizontalScrollIndicator={false}>
        {config && Object.keys(config).map(app => (
          <Pressable key={app} onPress={() => {set('app.activeSidebarItem', config[app]?.[0]?.path ?? null); set('app.activeApp', app);}} style={[styles.tab, app === get('app.activeApp') && styles.selected]}>
            <Text style={[styles.tabText, app === get('app.activeApp') && styles.selectedText]}> {title(app)}</Text>
          </Pressable>
        ))}
      </ScrollView>
        <Pressable onPress={() => set('app.showSearch', true)} style={styles.searchButton} accessibilityLabel="Search">
          <Icon name="search" size={22} color={styles.tabText.color} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  navigation: {
    borderRadius: 48,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    gap: 6,
  },
  sections: {
    gap: 6,
    flexDirection: 'row',
  },
  section: {
    paddingHorizontal: 16,
    flex: 0
  },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  searchButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 48,
  },
  sectionText: { fontSize: 14 },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 48,
    paddingHorizontal: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
