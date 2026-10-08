import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from '../useCompactLayout';

export function ActiveChat() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const [chat, setChat] = useState([]);
  const [messages, setMessages] = useState([]);
  const {get} = useAppContext();

  useEffect(() => {
    api.get('/whatsapp/chats/' + get("whatsapp.activeJid")).then(response => {
      setChat(response);
      setMessages(response.messages ?? []);
    });
  }, [get]);

  return (
    <View style={styles.content}>
      <ScrollView>
        {messages.map((message, index) => (
          <View key={index} style={styles.chatContainer}>
            <Text>{message.body}</Text>
          </View>
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
  activeChatName: {
    color: colors.onPrimary,
  },

  additionalContent: {
    flex: 2
  },
});
