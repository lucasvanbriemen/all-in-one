import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';

import {NativeModules} from 'react-native';
import {Song} from './Song';
import {api} from '../api';
import {useAppContext} from '../../context/AppContext';
import {useThemedStyles} from '../theme';

const MP3_URL = 'https://music.ltvb.nl/api/get-mp3/';

export function MusicPage({activeSidebarItem}) {
  const styles = useThemedStyles(createStyles);

  const [likedSongs, setLikedSongs] = useState([]);
  const { get, set } = useAppContext();

  useEffect(() => {
    api.get('/music').then(response => {
      setLikedSongs(response);
    });
  }, []);

  async function playSong(isrc) {
    const url = `${MP3_URL}${isrc}`;
    await NativeModules.AudioPlayer.play(url, {
      title: 'sunny',
      artist: "bonny",
      album: "sunny's album",
      artwork: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkwB_2pHUFCpbcaaUgqtfBj3xAmsGWFtzUN1YNFpn4_PoMdrPRXRSrq0Q&s=10",
    }, {Authorization: api.defaultHeaders.Authorization});

    set('now-playing', isrc);
  }

  return (
    <View style={styles.content}>
      <Text style={styles.greeting}>{get('now-playing')}</Text>

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
