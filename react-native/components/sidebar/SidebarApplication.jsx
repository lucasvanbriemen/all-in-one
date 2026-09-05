import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {SidebarRow} from './SidebarRow';

export function SidebarApplication({activeSidebarItem, setActiveSidebarItem, currentlyActive, setActiveApp, item, isMinimized, app}) {
  const styles = useThemedStyles(createStyles);
  const isExpanded = currentlyActive === app;

  return (
    <View style={styles.appWrapper}>
      <Pressable onPress={() => setActiveApp(app)}>
        {!isMinimized && <Text style={styles.title}>{getAppTitle(app)}</Text>}
      </Pressable>
      {isExpanded && item.map(row => (
        <SidebarRow key={row.path} icon={row.path} title={row.name} isSelected={isExpanded && activeSidebarItem === row.path} onPress={() => {setActiveSidebarItem(row.path); setActiveApp(app)}} useLabels={!isMinimized} />
      ))}
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
    marginBottom: 16,
    ...glass(colors, {tint: 0.25}),
    padding: 8,
    borderRadius: 16,
  },
});