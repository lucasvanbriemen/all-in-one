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

  const [contentHeight, setContentHeight] = useState(0);
  const [titleHeight, setTitleHeight] = useState(0);
  const height = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(height, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isExpanded, height]);

  const animatedHeight = height.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });


  return (
    <View style={styles.appWrapper}>
      <Animated.View style={{height: titleHeight, opacity: 1, overflow: 'hidden'}}>
        <Pressable
          onPress={() => set('app.activeApp', app)}
          onLayout={e => setTitleHeight(e.nativeEvent.layout.height)}
          style={styles.measure}>
          <Text style={styles.title} numberOfLines={1}>{getAppTitle(app)}</Text>
        </Pressable>
      </Animated.View>
      <Animated.View style={{height: animatedHeight, overflow: 'hidden'}}>
        <View
          onLayout={e => setContentHeight(e.nativeEvent.layout.height)}
          style={styles.measure}>
          {item.map(row => (
            <SidebarRow key={row.path} icon={row.path} title={row.name} isSelected={isExpanded && get("app.activeSidebarItem") === row.path} onPress={() => { set('app.activeSidebarItem', row.path); set('app.activeApp', app); }} />
          ))}
        </View>
      </Animated.View>
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
  measure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
