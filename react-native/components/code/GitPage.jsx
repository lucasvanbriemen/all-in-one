import {Button, Pressable, StyleSheet, Text, View, Image} from 'react-native';
import {glass, useTheme, useThemedStyles} from '../theme';
import { useApi } from '../useApi';

import {useAppContext} from '../../context/AppContext';

export function GitPage() {
  const { get, set } = useAppContext()
  const styles = useThemedStyles(createStyles);
  const { scheme } = useTheme();

  const { data: organizations = [] } = useApi('/github/organizations')

  function itemDescription(item) {
    let description = item.description || 'No description available';
    return {text: description, hasDescription: !!item.description};
  }

  return (
    <View>
      <Text>Git Page</Text>
      {organizations.map(org => (
        <View key={org.id} style={styles.orgContainer}>
          <Image
            source={{uri: scheme === 'dark' ? org.banner_dark_url : org.banner_light_url}}
            style={[StyleSheet.absoluteFill, styles.orgContainer.banner]}
            resizeMode="cover"
          />

          <View style={styles.orgContainer.topContainer}>
            <Image source={{uri: org.avatar_url}} style={styles.orgContainer.topContainer.avatar} />
            
            <View>
              <Text style={styles.orgContainer.topContainer.title}>{org.name}</Text>
              <Text style={[styles.orgContainer.topContainer.subtitle, !itemDescription(org).hasDescription && styles.orgContainer.topContainer.subtitle.isPlaceholder]}>{itemDescription(org).text}</Text>
            </View>
          </View>

          {org.repositories.map(repo => (
            <View key={repo.id}>
              <Text>- {repo.name}</Text>
              <Text>{repo.description}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  orgContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 32,
    backgroundColor: colors.surface,
    width: '33%',
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: 'hidden',
    
    banner: {
      opacity: 0.5,
    },

    topContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      ...glass(colors),
      borderRadius: 16,
      padding: 8,
      width: 'fit-content',

      avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
      },

      title: {
        color: colors.onSurface,
        fontSize: 18,
      },

      subtitle: {
        marginTop: 4,
        fontSize: 16,
        color: colors.onSurfaceVariant,

        isPlaceholder: {
          fontStyle: 'italic',
          opacity: 0.75,
        }
      }
    }
  },
});
