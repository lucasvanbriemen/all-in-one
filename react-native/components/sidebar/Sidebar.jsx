import {StyleSheet, View, Text, ScrollView} from 'react-native';

import {LogoIcon} from '../icons';
import {Platform} from 'react-native';
import {SidebarApplication} from './SidebarApplication';
import {SidebarNowPlaying} from '../music/SidebarNowPlaying';
import {useApi} from '../useApi';

function shouldBeVisible(allowedPlatforms) {
  const currentPlatform = Platform.OS.toLowerCase();

  const platforms = (allowedPlatforms || []).map(p => p.toLowerCase());
  return platforms.includes(currentPlatform);
}

export function Sidebar() {
  const {config = {}, allowed_platforms = {}} = useApi('/meta_data').data || {};
  const items = Object.entries(config).filter(([app]) =>
    shouldBeVisible(allowed_platforms[app])
  );

  return (
    <View style={{width: 240, overflow: 'hidden'}}>
      <View style={styles.sidebar}>
        <View style={styles.row}>
          <View>
            <LogoIcon size={24} color="red" />
          </View>
          <Text style={styles.name}>All in One</Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollView}>
          {items.map(([key, item]) => (
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
