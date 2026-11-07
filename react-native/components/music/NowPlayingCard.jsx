import {Image, Pressable, StyleSheet, Text, View, ScrollView} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import {player} from './player';
import {ChristmasMeter} from '../seasonal/ChristmasMeter';
import {SnowCap} from '../seasonal/SnowCap';
import {useAppContext} from '../../context/AppContext';
import {LikedSongs} from './LikedSongs';

export function NowPlayingCard() {
  const styles = useThemedStyles(createStyles);
  const {get, set} = useAppContext();

  return (
    <View style={[styles.content, get('music.now-playing.title') && styles.content.isPlaying]}>
      <SnowCap />

      {get('music.now-playing.title') && (
        <>
          <View style={styles.nowPlayingContainer}>
            <Image source={{uri: get('music.now-playing.image_url') ?? 'https://media.istockphoto.com/id/1980276924/vector/no-photo-thumbnail-graphic-element-no-found-or-available-image-in-the-gallery-or-album-flat.jpg?s=612x612&w=0&k=20&c=ZBE3NqfzIeHGDPkyvulUw14SaWfDj2rZtyiKv3toItk='}} style={styles.image} />

            <View>
              <Text numberOfLines={1} style={styles.title}>{get('music.now-playing.title') ?? 'Playing nothing'}</Text>
              <Text numberOfLines={1} style={styles.artist}>{get('music.now-playing.artist') ?? 'Unknown artist'}</Text>
            </View>
          </View>

          <View style={styles.controlsContainer}>
            <Pressable onPress={() => player.previous(set, get)} style={[styles.control, styles.controlInactive]}>
              <Icon name="last" size={24} color={styles.controlInactiveText.color} />
            </Pressable>

            {get('music.now-playing.is-playing') && (
              <Pressable
                onPress={() => player.pause()}
                style={[styles.control]}>
                <Icon name="pause" size={24} color={styles.controlText.color} />
              </Pressable>
            )}

            {get('music.now-playing.is-playing') === false && (
              <Pressable
                onPress={() => player.resume()}
                style={[styles.control]}>
                <Icon name="play" size={24} color={styles.controlText.color} />
              </Pressable>
            )}

            <Pressable onPress={() => player.next(set, get)} style={[styles.control, styles.controlInactive]}>
              <Icon name="next" size={24} color={styles.controlInactiveText.color} />
            </Pressable>

            <Pressable
              onPress={() => player.toggleRepeat(set, get)}
              style={[styles.control, !get('music.repeat') && styles.controlInactive]}>
              <Icon
                name="repeat"
                size={24}
                color={get('music.repeat') ? styles.controlText.color : styles.controlInactiveText.color}
              />
            </Pressable>

            <ChristmasMeter />
          </View>
        </>
      )}

      {!get('music.now-playing.title') && (
        <LikedSongs compact={true} limit={5} />
      )}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  controlsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  content: {
    paddingHorizontal: 16,
    ...glass(colors),
    borderRadius: 16,
    gap: 16,

    isPlaying: {
      padding: 16,
    }
  },
  title: {
    fontSize: 20,
    color: colors.onSurface,
  },
  artist: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },
  image: {
    width: 75,
    height: 75,
    borderRadius: 100,
  },
  nowPlayingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  control: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...glass(colors, {variant: 'accent'}),
    borderRadius: 100,
  },
  controlInactive: {
    ...glass(colors, {variant: 'subtle'}),
    borderRadius: 100,
  },
  controlInactiveText: {
    color: colors.onSurfaceVariant,
  },
  controlText: {
    color: colors.onPrimary,
  },
});
