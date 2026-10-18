import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {ChannelListing} from './ChannelListing';
import {Whatsapp} from './Whatsapp';
import {useAppContext} from '../../context/AppContext';

export function MessagesPage() {
  const {get, set} = useAppContext();
  const [sidebarItem, setSidebarItem] = useState(get("app.activeSidebarItem") ?? "whatsapp");

  useEffect(() => {
    setSidebarItem(get("app.activeSidebarItem") ?? "whatsapp");
  }, [get, set]);


  if (sidebarItem == "whatsapp") {
    return <Whatsapp />;
  }

  return <ChannelListing />;
}

const createStyles = colors => StyleSheet.create({
});
