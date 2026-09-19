import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';

import {Song} from './Song';
import {api} from '../api';
import {player} from './player';
import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from '../useCompactLayout';
import {useThemedStyles} from '../theme';

export function LikedSongs() {
  const styles = useThemedStyles(createStyles);
  const isCompact = useCompactLayout();

  const {set, get} = useAppContext();

  const [likedSongs, setLikedSongs] = useState([]);

  useEffect(() => {
    api.get('/music').then(response => {
      setLikedSongs(response);
    });
  }, []);

  return (
    <View style={styles.content}>
      <View style={[styles.details, isCompact && styles.detailsCompact]}>
        <Text style={styles.greeting}>Liked Songs</Text>
        <Text style={styles.subheading}>{likedSongs.length} songs, {(likedSongs.reduce((total, song) => total + song.duration, 0) / 60).toFixed(0)} minutes</Text>
        <Pressable onPress={() => player.playPlaylist(likedSongs, set, get)} style={styles.playAllButton}>
          <Text style={styles.playAllButtonText}>Play All</Text>
        </Pressable>
      </View>

      {likedSongs.map((song, index) => (
        <Song key={song.isrc} song={song} isEven={index % 2 === 0} onClick={() => player.playPlaylist(likedSongs, set, index, get)} />
      ))}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.onSurface
  },
  subheading: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
    marginVertical: 8
  },
  playAllButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 100,
    alignItems: 'center',
    marginVertical: 16,
 },
  playAllButtonText: {
    color: colors.onPrimary,
    fontWeight: 'bold',
  },
  details: {
    marginVertical: 24,
    width: '50%',
    marginLeft: '25%',
  },
  detailsCompact: {
    width: '100%',
    marginLeft: '0%',
  }
});
