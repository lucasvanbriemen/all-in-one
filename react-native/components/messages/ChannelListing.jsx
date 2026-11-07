import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';

import {ChannelListItem} from './ChannelListItem';
import {HiddenOrnament} from '../seasonal/Grinch';
import {useAppContext} from '../../context/AppContext';
import {useChannel} from '../cable';

export function ChannelListing({type}) {
  const bottomInset = useBottomInset();
  const styles = useThemedStyles(createStyles);
  const [channels, setChannels] = useState([]);

  function loadChats() {
    api.get(`/channels?type=${type}`).then(response => {
      setChannels(response);
    });
  }

  useEffect(loadChats, [type]);
  useChannel('MessagesChannel', event => {
    if (event.platform === type) loadChats();
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
