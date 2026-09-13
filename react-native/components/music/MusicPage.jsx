import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';

import {Song} from './Song';
import {api} from '../api';
import {useAppContext} from '../../context/AppContext';
import {useThemedStyles} from '../theme';

export function MusicPage({activeSidebarItem}) {
  const styles = useThemedStyles(createStyles);

  const [likedSongs, setLikedSongs] = useState([]);
  const { get } = useAppContext();

  useEffect(() => {
    api.get('/music').then(response => {
      setLikedSongs(response);
    });
  }, []);

  return (
    <View style={styles.content}>
      <Text style={styles.greeting}>{get('now-playing')}</Text>

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
});
