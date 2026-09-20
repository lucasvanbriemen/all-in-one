import {Badge, SEVERITY_COLORS} from './ui';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles, withAlpha} from '../theme';

import {Icon} from '../icons';
import React from 'react';

export const PANELS = [
  {id: 'files', label: 'Files', icon: 'files'},
  {id: 'search', label: 'Search', icon: 'search'},
  {id: 'git', label: 'Source control', icon: 'git'},
  {id: 'problems', label: 'Problems', glyph: '⚠'},
  {id: 'settings', label: 'Settings', glyph: '⚙'},
];