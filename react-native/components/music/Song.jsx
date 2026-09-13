import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {NativeModules} from 'react-native';
import {api} from '../api';
import {useAppContext} from '../../context/AppContext';

export function Song({song, isEven}) {
  const MP3_URL = 'https://music.ltvb.nl/api/get-mp3/';
  const styles = useThemedStyles(createStyles);
  const { set } = useAppContext();

  async function playSong() {
    const url = `${MP3_URL}${song.isrc}`;
    await NativeModules.AudioPlayer.play(url, {
      title: song.title,
      artist: song.artist,
      album: song.album,
      artwork: song.image_url,
    }, {Authorization: api.defaultHeaders.Authorization});

    set('now-playing', song.isrc);
  }
  return (
    <Pressable style={[styles.container, isEven && styles.evenBackground]} onPress={() => playSong()}>
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
