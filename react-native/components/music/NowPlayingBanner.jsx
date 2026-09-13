import {Image, NativeModules, Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {useAppContext} from '../../context/AppContext';

export function NowPlayingBanner() {
  const styles = useThemedStyles(createStyles);
  const { get, set } = useAppContext();

  async function pause() {
    await NativeModules.AudioPlayer.pause();
    set('music.now-playing.is-playing', false);
  }

  async function resume() {
    await NativeModules.AudioPlayer.resume();
    set('music.now-playing.is-playing', true);
  }

  return (
    <View style={styles.content}>
      <Image source={{uri: get('music.now-playing.image_url') ?? 'https://media.istockphoto.com/id/1980276924/vector/no-photo-thumbnail-graphic-element-no-found-or-available-image-in-the-gallery-or-album-flat.jpg?s=612x612&w=0&k=20&c=ZBE3NqfzIeHGDPkyvulUw14SaWfDj2rZtyiKv3toItk='}} style={styles.image} />

      {get('music.now-playing.is-playing') && (
        <Pressable onPress={pause}>
          <Text>Pause</Text>
        </Pressable>
      )}

      {get('music.now-playing.is-playing') === false && (
        <Pressable onPress={resume}>
          <Text>Resume</Text>
        </Pressable>
      )}

      <View> 
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
    marginVertical: 16,
    flexDirection: 'row',
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
    width: 75,
    height: 75,
    borderRadius: 16,
  }
});
