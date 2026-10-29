import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';

import {Message} from './Message';
import {MessageInput} from './MessageInput';
import {useAppContext} from '../../context/AppContext';
import {useChannel} from '../cable';

export function ActiveChannel({isThread = false}) {
  const styles = useThemedStyles(createStyles);
  const [messages, setMessages] = useState([]);
  const [channel, setChannel] = useState({});
  const {set, get} = useAppContext();

  const [activeChannel, setActiveChannel] = useState(get("messages.activeChannel") ?? "");

  useEffect(() => {
    setActiveChannel(get("messages.activeChannel") ?? "");
  }, [get]);

  function loadChats(messagePage = 1) {
    if (!activeChannel) return;

    const messageRoute = isThread ? `/channels/${activeChannel}/messages/${get("messages.activeThread")}/replies` : `/channels/${activeChannel}/messages?page=${messagePage}`;

    api.get(messageRoute).then(response => {
      if (messagePage === 1) {
        setMessages(response);
        return;
      }

      // Older page goes on top; skip any that shifted into this page since the last load
      setMessages(current => {
        const loadedIds = new Set(current.map(message => message.id));
        return [...response.filter(message => !loadedIds.has(message.id)), ...current];
      });
    });

    api.get(`/channels/${activeChannel}`).then(response => {
      setChannel(response);
    });
  }

  useEffect(loadChats, []);
  useEffect(loadChats, [activeChannel]);
  useChannel('WhatsappChannel', loadChats);

  return (
    <View style={styles.content}>
      <ScrollView style={styles.chatListing}>
        <Pressable onPress={() => loadChats(Math.floor(messages.length / 50) + 1)}>
          <Text style={styles.loadMore}>Load More</Text>
        </Pressable>

        {messages.map(message => (
          <Message key={message.id} message={message} showSender={!channel?.is_dm} />
        ))}
      </ScrollView>

      <View style={styles.additionalContent}>
        <MessageInput threadId={isThread ? get("messages.activeThread") : null} />
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  chatListing: {
    flex: 1,
  },
  compactStats: { flexWrap: 'wrap', gap: 8 },
  content: {
    flexDirection: 'column',
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
  loadMore: {
    textAlign: 'center',
    padding: 8,
    color: colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
});
