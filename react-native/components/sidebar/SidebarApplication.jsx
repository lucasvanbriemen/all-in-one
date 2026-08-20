import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {SidebarRow} from './SidebarRow';

export function SidebarApplication({selection, onSelect, currentlyActive, setActiveApp, item, isMinimized, app}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.appWrapper}>
      <Pressable onPress={() => setActiveApp(app)}>
        {!isMinimized && <Text style={styles.title}>{app}</Text>}
      </Pressable>
      {currentlyActive === app && item.map(row => (
        <SidebarRow key={row.path} icon={row.path} title={row.name} isSelected={currentlyActive === app && selection === row.path} onPress={() => {onSelect(row.path); setActiveApp(app)}} useLabels={!isMinimized} />
      ))}
    </View>
  );
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