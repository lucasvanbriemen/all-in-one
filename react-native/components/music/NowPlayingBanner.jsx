import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { glass, useThemedStyles } from '../theme';

import React from 'react';
import { player } from './player';
import { useAppContext } from '../../context/AppContext';
import { useCompactLayout } from '../useCompactLayout';

export function NowPlayingBanner() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const { get } = useAppContext();

  return (
    <View style={styles.content}>
      <Image
        source={{
          uri:
            get('music.now-playing.image_url') ??
            'https://media.istockphoto.com/id/1980276924/vector/no-photo-thumbnail-graphic-element-no-found-or-available-image-in-the-gallery-or-album-flat.jpg?s=612x612&w=0&k=20&c=ZBE3NqfzIeHGDPkyvulUw14SaWfDj2rZtyiKv3toItk=',
        }}
        style={[styles.image, compact && styles.compactImage]}
      />

      {get('music.now-playing.is-playing') && (
        <Pressable
          style={styles.control}
          accessibilityRole="button"
          onPress={() => player.pause()}
        >
          <Text style={styles.controlText}>Pause</Text>
        </Pressable>
      )}

      {get('music.now-playing.is-playing') === false && (
        <Pressable
          style={styles.control}
          accessibilityRole="button"
          onPress={() => player.resume()}
        >
          <Text style={styles.controlText}>Resume</Text>
        </Pressable>
      )}

      <View style={styles.info}>
        <Text
          numberOfLines={2}
          style={[styles.title, compact && styles.compactTitle]}
        >
          {get('music.now-playing.title') ?? 'Playing nothing'}
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.artist, compact && styles.compactArtist]}
        >
          {get('music.now-playing.artist') ?? 'Unknown artist'}
        </Text>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  info: { flex: 1, minWidth: 0 },
  control: { minHeight: 44, justifyContent: 'center' },
  controlText: { color: colors.primary },
  compactTitle: { fontSize: 18, fontWeight: '600' },
  compactArtist: { fontSize: 14 },
  compactImage: { width: 48, height: 48, borderRadius: 12 },
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
  },
});
