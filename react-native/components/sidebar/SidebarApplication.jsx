import {Animated, Easing} from 'react-native';
import {AppProvider, useAppContext} from '../../context/AppContext';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useRef, useState} from 'react';

import {SidebarRow} from './SidebarRow';

export function SidebarApplication({item, app}) {
  const styles = useThemedStyles(createStyles);
  const { get, set } = useAppContext();
  const isExpanded = true

  const height = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(height, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isExpanded, height]);
  

  return (
    <View style={styles.appWrapper}>
      <View>
        <Pressable
          onPress={() => set('app.activeApp', app)}>
          <Text style={styles.title} numberOfLines={1}>{getAppTitle(app)}</Text>
        </Pressable>
      </View>
      <View>
        {item.map(row => (
          <SidebarRow key={row.path} icon={row.path} title={row.name} isSelected={isExpanded && get("app.activeSidebarItem") === row.path} onPress={() => { set('app.activeSidebarItem', row.path); set('app.activeApp', app); }} />
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
