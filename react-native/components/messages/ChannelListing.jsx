import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';

import {ChannelListItem} from './ChannelListItem';
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
  useChannel('WhatsappChannel', loadChats);

  return (
    <ScrollView contentContainerStyle={[styles.channelListing, {paddingBottom: bottomInset}]}>
      {channels.map(channel => (
        <ChannelListItem key={channel.id} channel={channel} />
      ))}
    </ScrollView>
  );
}

const createStyles = colors => StyleSheet.create({
  channelListing: {
    flexGrow: 1,
  },
});
