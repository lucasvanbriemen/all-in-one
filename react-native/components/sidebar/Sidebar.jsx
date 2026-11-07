import {Animated, Pressable, StyleSheet, View, Text} from 'react-native';
import {glass, useTheme, useThemedStyles} from '../theme';
import {useEffect, useState} from 'react';

import {LogoIcon} from '../icons';
import {Platform} from 'react-native';
import {SidebarApplication} from './SidebarApplication';
import {SantaHat} from '../seasonal/SantaHat';
import {SnowCap} from '../seasonal/SnowCap';
import {api} from '../api';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Sidebar() {
  const [items, setItems] = useState([]);
  const styles = useThemedStyles(createStyles);
  const {primary} = useTheme();

  const width = 240;

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
    <View style={{width, overflow: 'hidden', marginTop: -14, paddingTop: 14}}>
      <View style={[styles.sidebar]}>
        <SnowCap maxHeight={11} inset={8} />
        <AnimatedPressable style={[styles.row]}>
          <View>
            <LogoIcon size={24} color={primary} />
            <SantaHat size={24} />
          </View>
          <Text style={styles.name}>All in One</Text>
        </AnimatedPressable>

        {Object.entries(items).map(([key, item]) => (
          <SidebarApplication key={key + item.app} item={item} app={key} />
        ))}
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  sidebar: {
    padding: 16,
    ...glass(colors, {variant: 'panel'}),
    borderRadius: 16,
    flexDirection: 'column',
    gap: 16,
  },
  row: {
    paddingVertical: 16,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 600,
    color: colors.onSurface,
    marginLeft: 8,
  },
});
