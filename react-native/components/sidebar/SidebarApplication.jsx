import {LogoIcon, SidebarIcon} from '../icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useTheme, useThemedStyles} from '../theme';

import {SidebarRow} from './SidebarRow';
import {api} from '../api';

export function SidebarApplication({selection, onSelect, currentlyActive, setActiveApp, item, isMinimized, app}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View>
      <Text style={styles.title}>{app}</Text>
      {item.map(row => (
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