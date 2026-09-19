import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useEffect, useState} from 'react';

import {LikedSongs} from './LikedSongs';
import {SearchSongs} from './SearchSongs';
import {Statistics} from './Statistics';
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

  const [sidebarItem, setSidebarItem] = useState(get("app.activeSidebarItem") ?? "songs");

  useEffect(() => {
    setSidebarItem(get("app.activeSidebarItem") ?? "songs");
  }, [get]);


  return (
    <View style={styles.content}>
      {pages[sidebarItem]}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
});
