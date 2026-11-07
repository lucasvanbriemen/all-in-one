import {Animated, Easing, Pressable, StyleSheet, View} from 'react-native';
import {glass, useTheme, useThemedStyles} from '../theme';
import {useEffect, useRef, useState} from 'react';

import {LogoIcon} from '../icons';
import {Platform} from 'react-native';
import {SidebarApplication} from './SidebarApplication';
import {SantaHat} from '../seasonal/SantaHat';
import {SnowCap} from '../seasonal/SnowCap';
import {api} from '../api';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Sidebar() {
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
      const currentPlatform = Platform.OS.toLowerCase();

      // Keep only the apps allowed on the current platform
      const allowedApps = {};
      for (const app in data.config) {
        const platforms = (data.allowed_platforms[app] || []).map(p => p.toLowerCase());
        if (platforms.includes(currentPlatform)) {
          allowedApps[app] = data.config[app];
        }
      }

      setItems(allowedApps);
    })
  }, []);

  return (
    // The negative margin plus padding leaves room above the panel for the
    // seasonal snow drift, which the clipping would otherwise cut off.
    <Animated.View style={{width, overflow: 'hidden', marginTop: -14, paddingTop: 14}}>
      <Animated.View style={[styles.sidebar, {paddingHorizontal: sidebarPaddingHorizontal, paddingBottom: sidebarPaddingBottom}]}>
        <SnowCap maxHeight={11} inset={8} />
        <AnimatedPressable onPress={() => setIsMinimized(!isMinimized)} style={[styles.row, {paddingHorizontal: rowPaddingHorizontal}]}>
          <View>
            <LogoIcon size={24} color={primary} />
            <SantaHat size={24} />
          </View>
        </AnimatedPressable>

        {Object.entries(items).map(([key, item]) => (
          <SidebarApplication key={key + item.app} item={item} progress={progress} app={key} />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = colors => StyleSheet.create({
  sidebar: {
    paddingTop: 16,
    ...glass(colors, {variant: 'panel'}),
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
