import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {ActiveChannel} from './ActiveChannel';
import {ChannelListing} from './ChannelListing';
import {Whatsapp} from './Whatsapp';
import {useAppContext} from '../../context/AppContext';

export function MessagesPage() {
  const {get} = useAppContext();
  const [sidebarItem, setSidebarItem] = useState(get("app.activeSidebarItem") ?? "whatsapp");
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    setSidebarItem(get("app.activeSidebarItem") ?? "whatsapp");
  }, [get]);


  if (sidebarItem == "whatsapp") {
    return <Whatsapp />;
  }

  return (
    <View style={styles.content}>
      <ChannelListing />
      <ActiveChannel />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
});
