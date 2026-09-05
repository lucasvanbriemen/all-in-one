import {Animated, Easing, Pressable, StyleSheet, View} from 'react-native';
import {glass, useTheme, useThemedStyles} from '../theme';
import {useEffect, useRef, useState} from 'react';

import {LogoIcon} from '../icons';
import {SidebarApplication} from './SidebarApplication';
import {api} from '../api';

export function Sidebar({activeSidebarItem, setActiveSidebarItem, currentlyActive, setActiveApp}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [items, setItems] = useState([]);
  const styles = useThemedStyles(createStyles);
  const {primary} = useTheme();

  const width = useRef(new Animated.Value(isMinimized ? 0 : 1)).current;

  const animatedWidth = width.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 240],
  });

  useEffect(() => {
    Animated.timing(width, {
      toValue: isMinimized ? 0 : 1,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  }, [isMinimized, width]);

  useEffect(() => {
    api.get('/meta_data').then(data => {
      setItems(data.config);
    })
  }, []);

  return (
    <Animated.View style={{width: animatedWidth, overflow: 'hidden'}}>
      <View style={[styles.sidebar, isMinimized && styles.sidebarMinimized]}>
        {/* The mark doubles as the collapse control, so the sidebar keeps its
            identity in both widths without spending a row on a toggle. */}
        <Pressable onPress={() => setIsMinimized(!isMinimized)} style={[styles.row, isMinimized && styles.rowMinimized]}>
          <LogoIcon size={24} color={primary} />
        </Pressable>

        {Object.entries(items).map(([key, item]) => (
          <SidebarApplication key={key + item.app} activeSidebarItem={activeSidebarItem} setActiveSidebarItem={setActiveSidebarItem} currentlyActive={currentlyActive} setActiveApp={setActiveApp} item={item} isMinimized={isMinimized} app={key} />
        ))}
      </View>
    </Animated.View>
  );
}

const createStyles = colors => StyleSheet.create({
  sidebar: {
    padding: 16,
    ...glass(colors, {tint: 0.25}),
    borderRadius: 16,
  },
  sidebarMinimized: {
    padding: 8,
    paddingTop: 16,
    paddingBottom: 16
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
  },
});
