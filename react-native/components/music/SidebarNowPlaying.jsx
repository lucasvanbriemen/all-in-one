import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import {Icon} from '../icons';
import {player} from './player';
import {useAppContext} from '../../context/AppContext';

/**
 * Mini player pinned to the bottom of the sidebar (like Apple Music's), so
 * nothing floats over the content card. Styled like the sidebar's group
 * containers: a faint see-through lift on the sidebar material.
 */
export function SidebarNowPlaying() {
  const styles = createStyles();
  const {get, set} = useAppContext();

  const title = get('music.now-playing.title');
  if (!title) {
    return null;
  }

  const playing = get('music.now-playing.is-playing');
  const image = get('music.now-playing.image_url');

  const openMusic = () => {
    set('app.activeApp', 'music');
    set('app.activeSidebarItem', 'songs');
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={openMusic} style={styles.info} accessibilityLabel="Open music">
        {image
          ? <Image source={{uri: image}} style={styles.artwork} />
          : <View style={[styles.artwork, styles.artworkEmpty]} />}
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{get('music.now-playing.artist') ?? 'Unknown artist'}</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => (playing ? player.pause() : player.resume())}
        accessibilityLabel={playing ? 'Pause' : 'Play'}
        style={({pressed}) => [styles.control, pressed && styles.controlPressed]}>
        <Icon name={playing ? 'pause' : 'play'} size={18} color={onSurface} />
      </Pressable>

      <Pressable
        onPress={() => player.next(set, get)}
        accessibilityLabel="Next"
        style={({pressed}) => [styles.control, pressed && styles.controlPressed]}>
        <Icon name="next" size={18} color={onSurface} />
      </Pressable>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withAlpha(colors.onSurface, 0.07),
    backgroundColor: withAlpha(colors.onSurface, 0.05),
  },
  info: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  artwork: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  artworkEmpty: {
    backgroundColor: withAlpha(colors.onSurface, 0.1),
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  artist: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  control: {
    width: 30,
    height: 30,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlPressed: {
    backgroundColor: withAlpha(colors.onSurface, 0.1),
  },
});
