import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';

import {ActiveChat} from './ActiveChat';
import {Message} from './Message';
import {useAppContext} from '../../context/AppContext';
import {useChannel} from '../cable';

export function ActiveChannel() {
  const styles = useThemedStyles(createStyles);
  const [messages, setMessages] = useState([]);
  const {set, get} = useAppContext();

  const [activeChannel, setActiveChannel] = useState(get("messages.activeChannel") ?? "");

  useEffect(() => {
    setActiveChannel(get("messages.activeChannel") ?? "");
  }, [get]);

  function loadChats() {
    if (!activeChannel) return;

    api.get(`/channels/${activeChannel}/messages`).then(response => {
      setMessages(response);
      console.log(response);
    });
  }

  useEffect(loadChats, []);
  useEffect(loadChats, [activeChannel]);
  useChannel('WhatsappChannel', loadChats);

  return (
    <View style={styles.content}>
      <ScrollView style={styles.chatListing}>
        {messages.map(message => (
          <Message key={message.id} message={message} />
        ))}
      </ScrollView>
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
    flex: 2,
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
