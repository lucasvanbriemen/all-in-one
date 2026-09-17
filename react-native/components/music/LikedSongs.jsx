import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';

import {NowPlayingBanner} from './NowPlayingBanner';
import {Song} from './Song';
import {api} from '../api';
import {player} from './player';
import {useAppContext} from '../../context/AppContext';
import {useThemedStyles} from '../theme';

export function LikedSongs() {
  const styles = useThemedStyles(createStyles);

  const {set} = useAppContext();

  const [likedSongs, setLikedSongs] = useState([]);

  useEffect(() => {
    api.get('/music').then(response => {
      setLikedSongs(response);
    });
  }, []);

  return (
    <View style={styles.content}>
      <Text style={styles.greeting}>Liked Songs</Text>

      <Text style={styles.subheading}>{likedSongs.length} songs, {(likedSongs.reduce((total, song) => total + song.duration, 0) / 60).toFixed(0)} minutes</Text>

      <Pressable onPress={() => player.playPlaylist(likedSongs, set)} style={styles.playAllButton}>
        <Text>Play All</Text>
      </Pressable>

      {likedSongs.map((song, index) => (
        <Song key={song.isrc} song={song} isEven={index % 2 === 0} onClick={() => player.playPlaylist(likedSongs, set, index)} />
      ))}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
    color: colors.outline
  }
});
