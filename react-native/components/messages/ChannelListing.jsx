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
  const [chats, setChats] = useState([]);
  const {set, get} = useAppContext();

  function loadChats() {
    api.get('/channels?type=slack').then(response => {
      setChats(response);
    });
  }

  useEffect(loadChats, []);
  useChannel('WhatsappChannel', loadChats);

  return (
    <View style={styles.content}>
      <Text>Channel Listing</Text>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  chatListing: {
    flex: 1,
  },
  compactStats: { flexWrap: 'wrap', gap: 8 },
  content: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  chatName: {
    fontSize: 16,
  },
  lastMessage: {
    color: colors.secondary,
    fontSize: 14,
    marginTop: 4,
  },
  chatContainer: {
    marginTop: 8,
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    marginRight: 16,
  },
  avatarFallback: {
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.onSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  unreadChat: {
    ...glass(colors, {variant: 'primaryContainer'}),

    borderColor: colors.primary,
    borderTopColor: colors.primary,
    borderWidth: 2,
  },

  activeChat: {
    backgroundColor: colors.primary,
    borderWidth: 2,
  },
  chatName: {
    fontSize: 16,
    color: colors.onSurface,
  },
  activeChatName: {
    color: colors.onPrimary,
  },

  additionalContent: {
    flex: 2
  },
});
