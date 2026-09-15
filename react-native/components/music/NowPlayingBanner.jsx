import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import React from 'react';
import {player} from './player';
import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from '../useCompactLayout';

export function NowPlayingBanner() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const { get } = useAppContext();

  return (
    <View style={styles.content}>
      <Image source={{uri: get('music.now-playing.image_url') ?? 'https://media.istockphoto.com/id/1980276924/vector/no-photo-thumbnail-graphic-element-no-found-or-available-image-in-the-gallery-or-album-flat.jpg?s=612x612&w=0&k=20&c=ZBE3NqfzIeHGDPkyvulUw14SaWfDj2rZtyiKv3toItk='}} style={[styles.image, compact && styles.compactImage]}/>

      <View> 
        <Text style={[styles.title, compact && styles.compactTitle]}>{get('music.now-playing.title') ?? 'Playing nothing'}</Text>
        <Text style={[styles.artist, compact && styles.compactArtist]}>{get('music.now-playing.artist') ?? 'Unknown artist'}</Text>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  compactTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  compactArtist: {
    fontSize: 14
  },
  compactImage: {
    width: 48,
    height: 48,
    borderRadius: 12
  },
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
