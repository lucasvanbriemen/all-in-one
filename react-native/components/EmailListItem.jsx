import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useState} from 'react';
import {glass, useThemedStyles} from './theme';

export function EmailListItem({item, isSelected, onPress}) {
  const styles = useThemedStyles(createStyles);
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}>
      <View style={[styles.card, hovered && styles.cardHovered, isSelected && styles.cardSelected]}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Image source={{uri: item.sender_image_url}} style={{width: 32, height: 32, borderRadius: 16, marginRight: 8}} />
          <View>
            <Text style={styles.title}>
              {item.subject}
            </Text>

            <Text style={styles.subtitle}>
              {item.sender_name}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    ...glass(colors, {tint: 0.38}),
  },
  cardHovered: {
    ...glass(colors, {tone: "surfaceAt3"}),
  },
  cardSelected: {
    borderColor: colors.primary,
    borderTopColor: colors.primary,
    borderWidth: 2,
    padding: 15,
  },
  title: {
    flex: 1,
    fontSize: 18,
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },
});
