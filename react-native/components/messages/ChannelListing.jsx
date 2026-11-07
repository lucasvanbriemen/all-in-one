import {useApi} from '../useApi';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';

import {ChannelListItem} from './ChannelListItem';
import {HiddenOrnament} from '../seasonal/Grinch';
import {useChannel} from '../cable';

export function ChannelListing({type}) {
  const bottomInset = useBottomInset();
  const styles = useThemedStyles(createStyles);
  const {data, refresh} = useApi(`/channels?type=${type}`);
  const channels = data || [];

  useChannel('MessagesChannel', event => {
    if (event.platform === type) refresh();
  });

  return (
    <ScrollView contentContainerStyle={[styles.channelListing, {paddingBottom: bottomInset}]}>
      {channels.map(channel => (
        <ChannelListItem key={channel.id} channel={channel} />
      ))}
      <HiddenOrnament spot="messages" style={styles.ornament} />
    </ScrollView>
  );
}

const createStyles = colors => StyleSheet.create({
  channelListing: {
    flexGrow: 1,
  },
  ornament: {alignSelf: 'flex-end', margin: 12},
});
