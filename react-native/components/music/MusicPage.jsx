import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';

import {Song} from './Song';
import {api} from '../api';
import {usePlayer} from '../contexts/PlayerContext';
import {useThemedStyles} from '../theme';

const MP3_URL = 'https://music.ltvb.nl/api/get-mp3/DED162500001';

export function MusicPage({activeSidebarItem}) {
  const styles = useThemedStyles(createStyles);
  const {track, isPlaying, error, play, toggle} = usePlayer();

  const [likedSongs, setLikedSongs] = useState([]);

  useEffect(() => {
    api.get('/music').then(response => {
      setLikedSongs(response);
    });
  }, []);

  const onPressPlay = () => {
    if (track?.url === MP3_URL) {
      toggle();
      return;
    }
    // Use the liked song's metadata for Now Playing when we have it.
    const song = likedSongs.find(s => MP3_URL.endsWith(s.isrc)) ?? likedSongs[0];
    play(MP3_URL, {
      title: song?.title ?? 'Unknown title',
      artist: song?.artist ?? 'Unknown artist',
      artwork: song?.image_url ?? '',
    });

    console.log(error);
  };

  return (
    <View style={styles.content}>
      <Text style={styles.greeting}>Hey</Text>

      <Pressable onPress={onPressPlay}>
        <Text style={styles.playButton}>{isPlaying ? 'Pause' : 'Play'}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {likedSongs.map((song, index) => (
        <Song key={song.isrc} song={song} isEven={index % 2 === 0} />
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
  },
  playButton: {
    fontSize: 16,
    color: colors.onSurface,
    paddingVertical: 8,
  },
  error: {
    color: colors.error ?? 'red',
    fontSize: 12,
  },
});
