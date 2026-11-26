import {ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {surfaceStyle, useThemedStyles} from '../theme';

import {api} from '../api';
import {Icon} from '../icons';

const TILE_HEIGHT = 100;

// Trending GIFs until something is typed; picking one sends it straight away.
export function GifPicker({onPick, onClose}) {
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      api.get(`/gifs?q=${encodeURIComponent(query.trim())}`).then(response => {
        if (cancelled) return;
        if (Array.isArray(response)) {
          setGifs(response);
          setError(null);
        } else {
          setError(response?.error || 'Could not load GIFs');
        }
      }).catch(() => !cancelled && setError('Could not load GIFs'));
    }, query ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <TextInput autoFocus style={styles.search} placeholder="Search GIPHY" placeholderTextColor={styles.hint.color}
          value={query} onChangeText={setQuery} />
        <Pressable onPress={onClose} accessibilityLabel="Close GIFs" hitSlop={8}>
          <Icon name="cross" size={18} color={styles.hint.color} />
        </Pressable>
      </View>

      {error ? <Text style={styles.hint}>{error}</Text>
        : !gifs ? <ActivityIndicator color={styles.hint.color} />
        : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
            {gifs.map(gif => (
              <Pressable key={gif.id} onPress={() => onPick(gif)} accessibilityLabel={gif.title || 'GIF'}
                style={({pressed}) => pressed && styles.pressed}>
                <Image source={{uri: gif.preview}}
                  style={[styles.tile, {width: gif.height ? (gif.width / gif.height) * TILE_HEIGHT : TILE_HEIGHT}]} />
              </Pressable>
            ))}
            {gifs.length === 0 && <Text style={styles.hint}>No GIFs found.</Text>}
          </ScrollView>
        )}
      <Text style={styles.attribution}>Powered by GIPHY</Text>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  panel: {
    ...surfaceStyle(colors),
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: colors.onSurface,
  },
  scroll: {
    maxHeight: 2 * TILE_HEIGHT + 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tile: {
    height: TILE_HEIGHT,
    borderRadius: 6,
    backgroundColor: colors.surfaceVariant,
  },
  pressed: {
    opacity: 0.6,
  },
  hint: {
    color: colors.outline,
  },
  attribution: {
    fontSize: 11,
    color: colors.outline,
    textAlign: 'right',
  },
});
