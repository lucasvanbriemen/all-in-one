import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import React, { useEffect, useState } from 'react';

import { NowPlayingBanner } from './NowPlayingBanner';
import { Song } from './Song';
import { api } from '../api';
import { player } from './player';
import { useAppContext } from '../../context/AppContext';
import {useScrollLayout} from '../ScrollLayout';
import { useThemedStyles } from '../theme';

export function MusicPage({ activeSidebarItem }) {
  const scrollLayout = useScrollLayout();
  const styles = useThemedStyles(createStyles);

  const { set } = useAppContext();

  const [likedSongs, setLikedSongs] = useState([]);

  useEffect(() => {
    api.get('/music').then(response => {
      setLikedSongs(response);
    });
  }, []);

  return (
    <FlatList
      style={styles.content}
      {...scrollLayout}
      data={likedSongs}
      keyExtractor={(song, index) => `${song.isrc}-${index}`}
      ListHeaderComponent={
        <>
          <NowPlayingBanner />
          <Pressable onPress={() => player.playPlaylist(likedSongs, set)}>
            <Text>Play All</Text>
          </Pressable>
        </>
      }
      renderItem={({ item: song, index }) => (
        <Song song={song} isEven={index % 2 === 0} onClick={() => player.playPlaylist(likedSongs, set, index)} />
      )}
      contentContainerStyle={[styles.listContent, scrollLayout.contentContainerStyle]}
    />
  );
}

const createStyles = colors => StyleSheet.create({
  content: { flex: 1 },
  listContent: { paddingBottom: 16 },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
    color: colors.outline,
  },
});
