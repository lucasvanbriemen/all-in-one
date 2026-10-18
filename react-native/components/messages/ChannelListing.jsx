import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';

import {ActiveChat} from './ActiveChat';
import {useAppContext} from '../../context/AppContext';
import {useChannel} from '../cable';

export function ChannelListing() {
  const bottomInset = useBottomInset();
  const styles = useThemedStyles(createStyles);
  const [channels, setChannels] = useState([]);
  const {set, get} = useAppContext();

  function openChannel(channel) {
    set('messages.activeChannel', channel.id);
  }

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
      console.log(unsortedChannels);
      setChannels(unsortedChannels);
    });
  }

  useEffect(loadChats, []);
  useChannel('WhatsappChannel', loadChats);

  return (
    <View style={styles.content}>
      <ScrollView style={styles.channelListing}>
        {channels.map(channel => (
          <Pressable key={channel.id} onPress={() => openChannel(channel)}>
            <Text>{channel.display_name}</Text>
            <Text>{channel.last_message?.body}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  channelListing: {
    flex: 1,
  },
});
