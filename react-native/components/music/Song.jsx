import {Image, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

export function Song({song, isEven}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.container, isEven && styles.evenBackground]}>
      <Image source={{uri: song.image_url}} style={styles.image} />

      <View style={styles.textContainer}> 
        <Text style={styles.title}>{song.title}</Text>
        <Text style={styles.artist}>{song.artist}</Text>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
    padding: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    color: colors.onSurface,
  },
  artist: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  textContainer: {
    flexDirection: 'column',
  },
  image: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  evenBackground: {
    ...glass(colors),
  },
});
