import {Animated, Easing, Pressable, StyleSheet} from 'react-native';
import {glass, useTheme, useThemedStyles} from '../theme';
import {useEffect, useRef, useState} from 'react';

import {LogoIcon} from '../icons';
import {SidebarApplication} from './SidebarApplication';
import {api} from '../api';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Sidebar({sidebarSelections, selectSidebarItem, currentlyActive, setActiveApp}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [items, setItems] = useState([]);
  const styles = useThemedStyles(createStyles);
  const {primary} = useTheme();

  // 0 = minimized, 1 = expanded. Everything that animates is derived from this
  // one value, so it all moves on the exact same curve.
  const progress = useRef(new Animated.Value(isMinimized ? 0 : 1)).current;
  const between = (min, max) => progress.interpolate({inputRange: [0, 1], outputRange: [min, max]});

  const width = between(60, 240);
  const sidebarPaddingHorizontal = between(8, 16);
  const sidebarPaddingBottom = between(16, 0);
  const rowPaddingHorizontal = between(8, 16);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isMinimized ? 0 : 1,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  }, [isMinimized, progress]);

  useEffect(() => {
    api.get('/meta_data').then(data => {
      setItems(data.config);
    })
  }, []);

  return (
    <Animated.View style={{width, overflow: 'hidden'}}>
      <Animated.View style={[styles.sidebar, {paddingHorizontal: sidebarPaddingHorizontal, paddingBottom: sidebarPaddingBottom}]}>
        <AnimatedPressable onPress={() => setIsMinimized(!isMinimized)} style={[styles.row, {paddingHorizontal: rowPaddingHorizontal}]}>
          <LogoIcon size={24} color={primary} />
        </AnimatedPressable>

        {Object.entries(items).map(([key, item]) => (
          <SidebarApplication key={key + item.app} activeSidebarItem={sidebarSelections[key] ?? null} selectSidebarItem={selectSidebarItem} currentlyActive={currentlyActive} setActiveApp={setActiveApp} item={item} progress={progress} app={key} />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = colors => StyleSheet.create({
  sidebar: {
    paddingTop: 16,
    ...glass(colors, {tint: 0.25}),
    borderRadius: 16,
  },
  row: {
    paddingVertical: 16,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
