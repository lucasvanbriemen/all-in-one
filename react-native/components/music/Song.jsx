import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {player} from './player';
import {useAppContext} from '../../context/AppContext';

export function Song({song, isEven}) {
  const styles = useThemedStyles(createStyles);
  const { set } = useAppContext();

  async function playSong() {
    await player.play(song, set);
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
