import {Animated, Easing} from 'react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useRef, useState} from 'react';

import {SidebarRow} from './SidebarRow';

export function SidebarApplication({activeSidebarItem, selectSidebarItem, currentlyActive, setActiveApp, item, progress, app}) {
  const styles = useThemedStyles(createStyles);
  const isExpanded = currentlyActive === app;

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

  // Collapse the title instead of unmounting it, so it shrinks away with the sidebar.
  const animatedTitleHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, titleHeight],
  });

  const titleOpacity = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.appWrapper}>
      <Animated.View style={{height: animatedTitleHeight, opacity: titleOpacity, overflow: 'hidden'}}>
        <Pressable
          onPress={() => setActiveApp(app)}
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
            <SidebarRow key={row.path} icon={row.path} title={row.name} isSelected={isExpanded && activeSidebarItem === row.path} onPress={() => selectSidebarItem(app, row.path)} progress={progress} />
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
