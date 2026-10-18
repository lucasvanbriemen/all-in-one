import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {Whatsapp} from './Whatsapp';
import {useAppContext} from '../../context/AppContext';

export function MessagesPage() {
  const {get} = useAppContext();
  const [sidebarItem, setSidebarItem] = useState(get("app.activeSidebarItem") ?? "songs");

  useEffect(() => {
    setSidebarItem(get("app.activeSidebarItem") ?? "songs");
  }, [get]);


  if (sidebarItem == "whatsapp") {
    return <Whatsapp />;
  }

  return null;
}

const createStyles = colors => StyleSheet.create({
});
