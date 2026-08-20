import {Pressable, StyleSheet, Text, View} from 'react-native';

import {SidebarRow} from './SidebarRow';
import {useThemedStyles} from '../theme';

export function SidebarApplication({selection, onSelect, currentlyActive, setActiveApp, item, isMinimized, app}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View>
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
    marginTop: 16,
  },
});