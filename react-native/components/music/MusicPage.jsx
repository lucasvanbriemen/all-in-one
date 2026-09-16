import {Pressable, StyleSheet, Text, View} from 'react-native';

import {LikedSongs} from './LikedSongs';
import {SearchSongs} from './SearchSongs';
import {useAppContext} from '../../context/AppContext';
import {useThemedStyles} from '../theme';

export function MusicPage() {
  const styles = useThemedStyles(createStyles);

  const {get} = useAppContext();

  const pages = {
    search: <SearchSongs />,
    liked: <LikedSongs />,
  };


  return (
    <View style={styles.content}>
      {pages[get("app.activeSideBarItem")]}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
});
