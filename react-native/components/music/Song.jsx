import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {NativeModules} from 'react-native';
import {api} from '../api';
import {set} from '../../context/AppContext';

export function Song({song, isEven}) {
  const MP3_URL = 'https://music.ltvb.nl/api/get-mp3/';
  const styles = useThemedStyles(createStyles);

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
    <Pressable style={[styles.container, isEven && styles.evenBackground]}>
      <Image source={{uri: song.image_url}} style={styles.image} />

      <View> 
        <Text style={styles.title}>{song.title}</Text>
        <Text style={styles.artist}>{song.artist}</Text>
      </View>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    width: '50%',
    marginLeft: '25%',
  },
  title: {
    fontSize: 16,
    color: colors.onSurface,
  },
  artist: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  image: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  evenBackground: {
    ...glass(colors),
  },
});
