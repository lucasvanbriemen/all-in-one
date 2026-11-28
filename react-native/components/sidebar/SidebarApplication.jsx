import {Pressable, StyleSheet, Text, View} from 'react-native';

import {SidebarRow} from './SidebarRow';

export function SidebarApplication({item, app}) {
  const styles = createStyles();

  return (
    <View style={styles.appWrapper}>
      <Text style={styles.title} numberOfLines={1}>{getAppTitle(app)}</Text>
      <View style={styles.rowsWrapper}>
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
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginVertical: 8,
    marginHorizontal: 0,
  },
  // On the translucent sidebar an opaque card would block the blur, so the
  // group is a faint see-through lift instead of a solid surface level.
  appWrapper: {
    borderWidth: 1,
    padding: 8,
    borderRadius: 16,
  },
});
