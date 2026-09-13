import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { glass, useThemedStyles } from '../theme';

import {NavigationBlur} from './NavigationBlur';
import { api } from '../api';

const title = name => name.charAt(0).toUpperCase() + name.slice(1);

export function MobileNavigation({currentlyActive, setActiveApp, activeSidebarItem, setActiveSidebarItem}) {
  const styles = useThemedStyles(createStyles);
  const [config, setConfig] = useState({});

  useEffect(() => {
    api.get('/meta_data').then(data => {
      setConfig(data.config ?? {});
    })
  }, []);

  const activeItem = config[currentlyActive];
  useEffect(() => {
    if (activeItem.length && !activeItem.some(row => row.path === activeSidebarItem)) {
      setActiveSidebarItem(activeItem[0].path);
    }
  }, [activeItem, activeSidebarItem, setActiveSidebarItem]);

  return (
    <View style={[styles.navigation, NavigationBlur != null && styles.blurredNavigation]}>
      {NavigationBlur != null && (
        <NavigationBlur pointerEvents="none" style={StyleSheet.absoluteFill} />
      )}
        <ScrollView horizontal contentContainerStyle={styles.sections}>
          {activeItem.map(row => (
            <Pressable key={row.path}
              onPress={() => setActiveSidebarItem(row.path)}
              style={[
                styles.section,
                row.path === activeSidebarItem && styles.selected,
              ]}
            >
              <Text
                style={[
                  styles.sectionText,
                  row.path === activeSidebarItem && styles.selectedText,
                ]}
              >
                {row.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      <View style={styles.tabs}>
        {config && Object.keys(config).map(app => (
          <Pressable key={app}
            onPress={() => {
              setActiveSidebarItem(config[app]?.[0]?.path ?? null);
              setActiveApp(app);
            }}
            style={[styles.tab, app === currentlyActive && styles.selected]}
          >
            <Text style={[styles.tabText, app === currentlyActive && styles.selectedText]}> {title(app)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    navigation: {
      ...glass(colors, { variant: 'subtle' }),
      borderRadius: 16,
      padding: 6,
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
      borderRadius: 12,
    },
    sectionText: { color: colors.onSurfaceVariant, fontSize: 14 },
    tabs: { flexDirection: 'row', gap: 4 },
    tab: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
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
