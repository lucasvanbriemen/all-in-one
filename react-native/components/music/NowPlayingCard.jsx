import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import React from 'react';
import {player} from './player';
import {useAppContext} from '../../context/AppContext';

export function NowPlayingCard() {
  const styles = useThemedStyles(createStyles);
  const {get, set} = useAppContext();

  return (
    <View style={styles.content}>
      <Image source={{uri: get('music.now-playing.image_url') ?? 'https://media.istockphoto.com/id/1980276924/vector/no-photo-thumbnail-graphic-element-no-found-or-available-image-in-the-gallery-or-album-flat.jpg?s=612x612&w=0&k=20&c=ZBE3NqfzIeHGDPkyvulUw14SaWfDj2rZtyiKv3toItk='}} style={styles.image} />

      <View style={styles.textContainer}>
        <Text style={styles.title}>{get('music.now-playing.title') ?? 'Playing nothing'}</Text>
        <Text style={styles.artist}>{get('music.now-playing.artist') ?? 'Unknown artist'}</Text>
      </View>

      <Pressable onPress={() => player.previous(set, get)} style={({pressed}) => [styles.control, pressed && styles.controlPressed]}>
        <Text style={styles.controlText}>Previous</Text>
      </Pressable>

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
        <Text style={styles.controlText}>Next</Text>
      </Pressable>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    padding: 16,
    ...glass(colors),
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 32,
    color: colors.onSurface,
  },
  artist: {
    fontSize: 24,
    color: colors.onSurfaceVariant,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 100,
  },
  textContainer: {
    alignItems: 'center',
    gap: 8,
  },
  control: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...glass(colors, {variant: 'accent'}),
    borderRadius: 100,
  },
  controlPressed: {
    opacity: 0.82,
    transform: [{scale: 0.96}],
  },
  controlText: {
    color: colors.onPrimary,
  },
});
