import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {Message} from './Message';
import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from '../useCompactLayout';

export function ActiveChat() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const [chat, setChat] = useState([]);
  const [messages, setMessages] = useState([]);
  const {get} = useAppContext();
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    api.get('/whatsapp/chats/' + get("whatsapp.activeJid")).then(response => {
      setChat(response);
      setMessages((response.messages ?? []).slice().reverse());
    });
  }, [get]);

  async function sendMessage() {
    const text = messageInput.trim();
    if (text === '') return;
    const jid = get("whatsapp.activeJid");
    const sent = await api.post('/whatsapp/chats/' + jid + '/send', {text});

    // The send endpoint only returns {id, chat, sent_at}; build a message
    // in the same shape as the index endpoint so it renders like the rest.
    setMessages(prev => [...prev, {
      id: sent.id,
      chat_jid: jid,
      from_me: true,
      kind: 'text',
      body: text,
      sent_at: sent.sent_at,
      status: 'sent',
      reactions: [],
    }]);
    setMessageInput('');
  }

  return (
    <View style={styles.content}>
      <ScrollView>
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}

        <View>
          <TextInput value={messageInput} onChangeText={setMessageInput} placeholder="Type a message" style={styles.messageInput} />
          <Pressable onPress={sendMessage}>
            <Text>Send</Text>
          </Pressable>
        </View>
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

  messageInput: {
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
});
