import React, { useEffect, useState } from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {api} from '../api';
import {useThemedStyles} from '../theme';

export function MusicPage({activeSidebarItem}) {
  const styles = useThemedStyles(createStyles);

  const [likedSongs, setLikedSongs] = useState([]);

  useEffect(() => {
    api.get('/music').then(response => {
      setLikedSongs(response);
    });
  }, []);

  return (
    <View style={styles.content}>
      <Text style={styles.greeting}>Hey</Text>

      {likedSongs.map(song => (
        <Text key={song.isrc}>{song.title}</Text>
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
