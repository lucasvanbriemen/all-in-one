import {Animated, Easing} from 'react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useRef, useState} from 'react';

import {SidebarRow} from './SidebarRow';

export function SidebarApplication({
  activeSidebarItem, setActiveSidebarItem, currentlyActive,
  setActiveApp, item, isMinimized, app,
}) {
  const styles = useThemedStyles(createStyles);
  const isExpanded = currentlyActive === app;

  const [contentHeight, setContentHeight] = useState(0);
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

  function getAppTitle(app) {
    switch (app) {
      case 'home':
        return 'Home';
      case 'work':
        return 'Work';
      case 'github':
        return 'GitHub';
      case 'pathe':
        return 'Pathe';
      case 'code':
        return 'Code';
      default:
        return app;
    }
  }

  return (
    <View style={styles.appWrapper}>
      <Pressable onPress={() => setActiveApp(app)}>
        {!isMinimized && <Text style={styles.title}>{getAppTitle(app)}</Text>}
      </Pressable>

      <Animated.View style={{height: animatedHeight, overflow: 'hidden'}}>
        <View
          onLayout={e => setContentHeight(e.nativeEvent.layout.height)}
          style={styles.measure}>
          {item.map(row => (
            <SidebarRow
              key={row.path}
              icon={row.path}
              title={row.name}
              isSelected={isExpanded && activeSidebarItem === row.path}
              onPress={() => { setActiveSidebarItem(row.path); setActiveApp(app); }}
              useLabels={!isMinimized}
            />
          ))}
        </View>
      </Animated.View>
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
  measure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});