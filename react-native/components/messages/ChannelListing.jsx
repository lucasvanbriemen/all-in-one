import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';

import {ActiveChat} from './ActiveChat';
import {ChannelListItem} from './ChannelListItem';
import {useAppContext} from '../../context/AppContext';
import {useChannel} from '../cable';

export function ChannelListing() {
  const bottomInset = useBottomInset();
  const styles = useThemedStyles(createStyles);
  const [channels, setChannels] = useState([]);

  function loadChats() {
    api.get('/channels?type=slack').then(response => {
      let unsortedChannels = response;

      // We want to sort them based on is_dm first, then is_group_chat, from a to z by name
      unsortedChannels.sort((a, b) => {
        if (a.is_dm && !b.is_dm) return -1;
        if (!a.is_dm && b.is_dm) return 1;
        if (a.is_group_chat && !b.is_group_chat) return -1;
        if (!a.is_group_chat && b.is_group_chat) return 1;
        return a.display_name.localeCompare(b.display_name);
      });
      setChannels(unsortedChannels);
    });
  }

  useEffect(loadChats, []);
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
