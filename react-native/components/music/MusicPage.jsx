import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';

import {Song} from './Song';
import {api} from '../api';
import {usePlayer} from '../contexts/PlayerContext';
import {useThemedStyles} from '../theme';

const MP3_URL = 'https://music.ltvb.nl/api/get-mp3/';

export function MusicPage({activeSidebarItem}) {
  const styles = useThemedStyles(createStyles);
  const {play} = usePlayer();

  const [likedSongs, setLikedSongs] = useState([]);

  useEffect(() => {
    api.get('/music').then(response => {
      setLikedSongs(response);
    });
  }, []);

  function playSong(isrc) {
    play(`${MP3_URL}${isrc}`);
  }

  return (
    <View style={styles.content}>
      <Text style={styles.greeting}>Hey</Text>

      {likedSongs.map((song, index) => (
        <React.Fragment key={`fragment-${song.isrc}`}>
          <Pressable key={`play-${song.isrc}`} onPress={() => playSong(song.isrc)}>
            <Text>Play</Text>
          </Pressable>
          <Song key={song.isrc} song={song} isEven={index % 2 === 0} />
        </React.Fragment>
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
