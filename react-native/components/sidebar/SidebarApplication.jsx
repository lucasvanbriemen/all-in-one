import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {SidebarRow} from './SidebarRow';

export function SidebarApplication({item, app}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.appWrapper}>
      <Text style={styles.title} numberOfLines={1}>{getAppTitle(app)}</Text>
      <View>
        {item.map(row => (
          <SidebarRow key={row.path} row={row} app={app} />
        ))}
      </View>
    </View>
  );
}

function getAppTitle(app) {
  return app.charAt(0).toUpperCase() + app.slice(1);
}

const createStyles = colors => StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginVertical: 8,
    marginHorizontal: 0,
  },
  appWrapper: {
    ...glass(colors, {variant: 'subtle'}),
    padding: 8,
    borderRadius: 16,
  },
});
