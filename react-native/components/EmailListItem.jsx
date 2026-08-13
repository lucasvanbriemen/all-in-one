import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useState} from 'react';

import {SidebarMaterial} from './TransparentWindow';
import {useThemedStyles} from './theme';

export function EmailListItem({item, isSelected, onPress}) {
  const styles = useThemedStyles(createStyles);
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}>
      <SidebarMaterial style={[styles.card, hovered && styles.cardHovered, isSelected && styles.cardSelected]}>
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
      </SidebarMaterial>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    marginLeft: 12,
  },
  /**
   * Sits *behind* the material's tint layer rather than replacing it, so the
   * two stack and the row reads as slightly brighter on hover.
   */
  cardHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  cardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
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
