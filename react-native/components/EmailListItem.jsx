import {Pressable, StyleSheet, Text} from 'react-native';
import React, {useState} from 'react';

import {SidebarMaterial} from './TransparentWindow';
import {useThemedStyles} from './theme';

export function EmailListItem({item}) {
  const styles = useThemedStyles(createStyles);
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}>
      <SidebarMaterial style={[styles.card, hovered && styles.cardHovered]}>
        <Text style={styles.title} numberOfLines={1}>
          {item.subject}
        </Text>
      </SidebarMaterial>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
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
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: '400',
    color: colors.onSurface,
  },
});
