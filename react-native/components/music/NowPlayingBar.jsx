import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import {Icon} from '../icons';
import {NavigationBlur} from '../sidebar/NavigationBlur';
import {player} from './player';
import {useAppContext} from '../../context/AppContext';

export function NowPlayingBar() {
  const styles = createStyles();
  const {get, set} = useAppContext();

  if (!get('music.now-playing.title')) {
    return null;
  }

  return (
    <View style={styles.content}>
      {NavigationBlur != null && <NavigationBlur pointerEvents="none" style={StyleSheet.absoluteFill} />}

      <Image source={{uri: get('music.now-playing.image_url') ?? 'https://media.istockphoto.com/id/1980276924/vector/no-photo-thumbnail-graphic-element-no-found-or-available-image-in-the-gallery-or-album-flat.jpg?s=612x612&w=0&k=20&c=ZBE3NqfzIeHGDPkyvulUw14SaWfDj2rZtyiKv3toItk='}} style={styles.image} />

      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>{get('music.now-playing.title') ?? 'Playing nothing'}</Text>
        <Text style={styles.artist}>{get('music.now-playing.artist') ?? 'Unknown artist'}</Text>
      </View>

      <View style={styles.controlsContainer}>
        {get('music.now-playing.is-playing') && (
          <Pressable
            onPress={() => player.pause()}
            style={({pressed}) => [styles.control, pressed && styles.controlPressed]}>
            <Icon name="pause" size={24} color={styles.controlText.color} />
          </Pressable>
        )}

        {get('music.now-playing.is-playing') === false && (
          <Pressable
            onPress={() => player.resume()}
            style={({pressed}) => [styles.control, pressed && styles.controlPressed]}>
            <Icon name="play" size={24} color={styles.controlText.color} />
          </Pressable>
        )}

        <Pressable onPress={() => player.next(set, get)} style={({pressed}) => [styles.control, pressed && styles.controlPressed]}>
          <Icon name="next" size={24} color={styles.controlText.color} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  controlsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  content: {
    padding: 8,
    borderRadius: 100,
    alignItems: 'center',
    gap: 16,
    flexDirection: 'row',
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  title: {
    fontSize: 16,
  },
  artist: {
    fontSize: 11,
  },
  image: {
    width: 32,
    height: 32,
    borderRadius: 100,
  },
  textContainer: {
    flex: 1,
  },
  control: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  controlPressed: {
    opacity: 0.82,
    transform: [{scale: 0.96}],
  },
  controlText: {
  },
});
