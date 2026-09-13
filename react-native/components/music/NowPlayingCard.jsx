import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import React from 'react';
import {player} from './player';
import {useAppContext} from '../../context/AppContext';

export function NowPlayingCard() {
  const styles = useThemedStyles(createStyles);
  const { get, set } = useAppContext();

  return (
    <View style={styles.content}>
      <Image source={{uri: get('music.now-playing.image_url') ?? 'https://media.istockphoto.com/id/1980276924/vector/no-photo-thumbnail-graphic-element-no-found-or-available-image-in-the-gallery-or-album-flat.jpg?s=612x612&w=0&k=20&c=ZBE3NqfzIeHGDPkyvulUw14SaWfDj2rZtyiKv3toItk='}} style={styles.image} />

      {get('music.now-playing.is-playing') && (
        <Pressable onPress={() => player.pause()} style={styles.control}>
          <Icon name="pause" size={24} color={styles.controlText.color} />
        </Pressable>
      )}

      {get('music.now-playing.is-playing') === false && (
        <Pressable onPress={() => player.resume()} style={styles.control}>
          <Icon name="play" size={24} color={styles.controlText.color} />
        </Pressable>
      )}

      <View style={styles.textContainer}>
        <Text style={styles.title}>{get('music.now-playing.title') ?? 'Playing nothing'}</Text>
        <Text style={styles.artist}>{get('music.now-playing.artist') ?? 'Unknown artist'}</Text>
      </View>
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
    padding: 8,
    ...glass(colors, {tone: "primary"}),
    borderRadius: 100,
  },
  controlText: {
    color: colors.onPrimary,
  },
});
