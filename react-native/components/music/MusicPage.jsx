import {Pressable, StyleSheet, Text, View} from 'react-native';

import {LikedSongs} from './LikedSongs';
import {SearchSongs} from './SearchSongs';
import {Statistics} from './Statistics';
import {HiddenOrnament} from '../seasonal/Grinch';
import {useAppContext} from '../../context/AppContext';
import {useThemedStyles} from '../theme';

export function MusicPage() {
  const styles = useThemedStyles(createStyles);

  const {get} = useAppContext();

  const pages = {
    search: <SearchSongs />,
    songs: <LikedSongs />,
    stats: <Statistics />,
  };

  const sidebarItem = get("app.activeSidebarItem") ?? "songs";


  return (
    <View style={styles.content}>
      {pages[sidebarItem]}
      <HiddenOrnament spot="music" style={{alignSelf: 'flex-end', margin: 8}} />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
});
