import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

export function Song({song, isEven, onClick}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable style={[styles.container, isEven && styles.evenBackground]} onPress={() => onClick()}>
      <Image source={{uri: song.image_url}} style={styles.image} />

      <View> 
        <Text style={styles.title}>{song.title}</Text>
        <Text style={styles.artist}>{song.artist}</Text>
      </View>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
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
});
