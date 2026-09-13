import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { glass, useThemedStyles } from '../theme';
import {NavigationBlur} from './NavigationBlur';

const APPLICATIONS = ['home', 'email', 'music', 'code'];
const EMPTY_ROWS = [];
const title = name => name.charAt(0).toUpperCase() + name.slice(1);

export function MobileNavigation({
  currentlyActive,
  setActiveApp,
  activeSidebarItem,
  setActiveSidebarItem,
}) {
  const styles = useThemedStyles(createStyles);
  const [config, setConfig] = useState({});

  useEffect(() => {
    let active = true;
    api
      .get('/meta_data')
      .then(data => {
        if (active) {
          setConfig(data.config ?? {});
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const rows = config[currentlyActive] ?? EMPTY_ROWS;
  useEffect(() => {
    if (rows.length && !rows.some(row => row.path === activeSidebarItem)) {
      setActiveSidebarItem(rows[0].path);
    }
  }, [rows, activeSidebarItem, setActiveSidebarItem]);

  return (
    <View style={[styles.navigation, NavigationBlur && styles.blurredNavigation]}>
      {NavigationBlur && <NavigationBlur pointerEvents="none" style={StyleSheet.absoluteFill} />}
      {(currentlyActive === 'email' || currentlyActive === 'code') &&
        rows.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sections}
          >
            {rows.map(row => (
              <Pressable
                key={row.path}
                accessibilityRole="tab"
                accessibilityState={{
                  selected: row.path === activeSidebarItem,
                }}
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
        )}
      <View style={styles.tabs}>
        {APPLICATIONS.map(app => (
          <Pressable
            key={app}
            accessibilityRole="tab"
            accessibilityState={{ selected: app === currentlyActive }}
            onPress={() => {
              setActiveSidebarItem(config[app]?.[0]?.path ?? null);
              setActiveApp(app);
            }}
            style={[styles.tab, app === currentlyActive && styles.selected]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabText,
                app === currentlyActive && styles.selectedText,
              ]}
            >
              {title(app)}
            </Text>
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
