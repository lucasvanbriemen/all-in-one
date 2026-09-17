import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useTheme, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import {api} from '../api';
import {useCompactLayout} from '../useCompactLayout';
import {useState} from 'react';

export function Song({song, isEven, onClick}) {
  const compact = useCompactLayout();
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isLiked, setIsLiked] = useState(song.is_liked);

  function toggleLike() {
    setIsLiked(liked => !liked);

    api.post(`/music/${song.isrc}/toggle-liked`);
  }

  return (
    <View style={[styles.container, compact && styles.compact, isEven && styles.evenBackground]}>
      <Pressable style={styles.pressable} onPress={() => onClick()}>
        <Image source={{uri: song.image_url}} style={styles.image} />

        <View style={styles.textContainer}> 
          <Text style={styles.title}>{song.title}</Text>
          <Text style={styles.artist}>{song.artist}</Text>
        </View>
      </Pressable>

      <Pressable style={[styles.likeButton, isLiked && styles.isLiked]} onPress={toggleLike}>
        <Icon name={isLiked ? "heart" : "heart-outline"} size={16} color={isLiked ? colors.onSecondary : colors.onSurfaceVariant} />
      </Pressable>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  compact: {
    width: '100%', 
    marginLeft: 0,
  },
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
  textContainer: {
    flex: 1,
  },
  likeButton: {
    padding: 8,
    borderRadius: 8,
    ...glass(colors),
  },
  isLiked: {
    backgroundColor: colors.secondary,
  },
  pressable: {
    flex: 1,
    gap: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
