import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout, useKeyboardHeight} from '../useCompactLayout';

import {Icon} from '../icons';
import {Message} from './Message';
import {NavigationBlur} from '../sidebar/NavigationBlur';
import {mediaPicker} from '../mediaPicker';
import {useAppContext} from '../../context/AppContext';
import {useChannel} from '../cable';

export function ActiveChat() {
  const compact = useCompactLayout();
  const bottomInset = useBottomInset();
  const keyboardHeight = useKeyboardHeight();
  const styles = useThemedStyles(createStyles);
  const [chat, setChat] = useState([]);
  const [messages, setMessages] = useState([]);
  const {get, set} = useAppContext();
  const [messageInput, setMessageInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const scrollViewRef = useRef(null);

  const activeJid = get("whatsapp.activeJid");

  function loadChat() {
    api.get('/whatsapp/chats/' + activeJid).then(response => {
      setChat(response.chat);
      setMessages((response.messages ?? []).slice().reverse());
    });
  }

  useEffect(loadChat, [activeJid]);

  useChannel('WhatsappChannel', ({jid}) => {
    if (jid === activeJid) loadChat();
  });

  async function pickAttachment() {
    const picked = await mediaPicker.pick();
    if (picked) setAttachment(picked);
  }

  // The message text becomes the caption. The bubble shows the local file
  // with a clock until the upload finishes.
  async function sendAttachment() {
    const picked = attachment;
    const caption = messageInput.trim();
    const jid = get("whatsapp.activeJid");
    const localId = 'local-' + Date.now();
    setMessages(prev => [...prev, {
      id: localId,
      chat_jid: jid,
      from_me: true,
      kind: picked.kind === 'video' ? 'videoMessage' : 'imageMessage',
      body: caption,
      media: {width: picked.width, height: picked.height},
      local_uri: picked.uri,
      sent_at: new Date().toISOString(),
      status: 1,
      reactions: [],
    }]);
    setAttachment(null);
    setMessageInput('');

    let update;
    try {
      const file = picked.file ?? {uri: picked.uri, name: picked.name, type: picked.type};
      const sent = await api.upload('/whatsapp/chats/' + jid + '/send_media', {file, caption: caption || null});
      update = {id: sent.id, sent_at: sent.sent_at, status: 2};
    } catch (error) {
      console.warn('Sending media failed', error);
      update = {status: 0};
    }
    setMessages(prev => prev.map(message => message.id === localId ? {...message, ...update} : message));
  }

  async function sendMessage() {
    if (attachment) return sendAttachment();
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
    // The floating navigation sits behind the keyboard, so while it is open only the keyboard needs clearing.
    <View style={[styles.content, {paddingBottom: keyboardHeight > 0 ? keyboardHeight + 8 : bottomInset}]}>
      {compact && (
        <View style={styles.chatListing}>
          <Pressable onPress={() => set("whatsapp.activeJid", null)}>
            <Icon name="chevron-left" size={24} color={styles.chatName.color} />
          </Pressable>

          <View style={styles.contactDetails}>
            {NavigationBlur != null && <NavigationBlur pointerEvents="none" style={StyleSheet.absoluteFill} />}
            <Image source={{uri: BASE_URL + chat.avatar_url}} style={styles.chatImage} />
            <Text style={styles.chatName}>{chat.name}</Text>
          </View>
        </View>
      )}

      <ScrollView ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })} contentContainerStyle={styles.messagesContainer}>
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}
      </ScrollView>

      {attachment && (
        <View style={styles.attachment}>
          {attachment.kind === 'image'
            ? <Image source={{uri: attachment.uri}} style={styles.attachmentPreview} />
            : <Text>🎬</Text>}
          <Text style={styles.attachmentName} numberOfLines={1}>{attachment.name}</Text>
          <Pressable onPress={() => setAttachment(null)}>
            <Icon name="cross" size={16} color={styles.attachmentName.color} />
          </Pressable>
        </View>
      )}

      <View style={styles.composer}>
        <Pressable onPress={pickAttachment}>
          <Text>Attach</Text>
        </Pressable>
        <TextInput value={messageInput} onChangeText={setMessageInput} onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({animated: true}), 300)} placeholder={attachment ? "Add a caption" : "Type a message"} style={styles.messageInput} />
        <Pressable onPress={sendMessage}>
          <Text>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  chatListing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    padding: 8,
    borderRadius: 12,
  },

  chatName: {
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  compactStats: { flexWrap: 'wrap', gap: 8 },
  content: {
    flexDirection: 'column',
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
  chatImage: {
    width: 45,
    height: 45,
    borderRadius: 25,
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

  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: 12,
    ...glass(colors),
  },
  attachmentPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  attachmentName: {
    flex: 1,
    color: colors.secondary,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  messagesContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
