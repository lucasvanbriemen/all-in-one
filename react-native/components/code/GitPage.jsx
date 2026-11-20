import {Button, Pressable, StyleSheet, Text, View, Image} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import { useApi } from '../useApi';

import {useAppContext} from '../../context/AppContext';

export function GitPage() {
  const { get, set } = useAppContext()
  const styles = useThemedStyles(createStyles);

  const { data: organizations = [] } = useApi('/github/organizations')

  return (
    <View>
      <Text>Git Page</Text>
      {organizations.map(org => (
        <View key={org.id} style={styles.orgContainer}>
          <Image source={{uri: org.avatar_url}} style={{width: 50, height: 50}} />
          <Text>{org.name}</Text>
          <Text>{org.description}</Text>

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
  },
});
