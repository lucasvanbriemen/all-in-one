import {StyleSheet, View, Text, ScrollView} from 'react-native';
import {useEffect, useState} from 'react';

import {LogoIcon} from '../icons';
import {Platform} from 'react-native';
import {SidebarApplication} from './SidebarApplication';
import {SidebarNowPlaying} from '../music/SidebarNowPlaying';
import {SantaHat} from '../seasonal/SantaHat';
import {SnowCap} from '../seasonal/SnowCap';
import {api} from '../api';

export function Sidebar() {
  const [items, setItems] = useState([]);

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
      <View style={styles.sidebar}>
        <SnowCap maxHeight={11} inset={8} />
        <View style={styles.row}>
          <View>
            <LogoIcon size={24} color="red" />
            <SantaHat size={24} />
          </View>
          <Text style={styles.name}>All in One</Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollView}>
          {Object.entries(items).map(([key, item]) => (
            <SidebarApplication key={key + item.app} item={item} app={key} />
          ))}
        </ScrollView>

        <SidebarNowPlaying />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 12,
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
  },
  scroll: {
    flex: 1,
  },
  scrollView: {
    gap: 12,
    paddingBottom: 16,
  },
});
