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
      <View style={styles.channelListing}>
        <ChannelListing />
      </View>

      <View style={styles.activeChannelWrapper}>
        <View style={styles.activeChannel}>
          <ActiveChannel />
        </View>

        {get("messages.activeThread") && (
          <View style={[styles.activeChannel, styles.activeChannelThread]}>
            <ActiveChannel isThread={true} />
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  activeChannelThread: {
    ...glass(colors),
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  channelListing: {
    flex: 1,
  },
  activeChannel: {
    flex: 1,
    marginVertical: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  activeChannelWrapper: {
    flex: 2,
    flexDirection: 'row'
  },
});
