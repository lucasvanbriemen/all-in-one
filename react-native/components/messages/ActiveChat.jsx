import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout, useKeyboardHeight} from '../useCompactLayout';

import {Icon} from '../icons';
import {Message} from './Message';
import {NavigationBlur} from '../sidebar/NavigationBlur';
import {mediaPicker} from '../mediaPicker';
import {push} from '../push';
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
  const [selectedId, setSelectedId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const scrollViewRef = useRef(null);

  const activeJid = get("whatsapp.activeJid");

  function loadChat() {
    api.get('/whatsapp/chats/' + activeJid).then(response => {
      setChat(response.chat);
      setMessages((response.messages ?? []).slice().reverse());
    });
  }

  useEffect(loadChat, [activeJid]);
  useEffect(() => push.clearDelivered('messages.whatsapp.' + activeJid), [activeJid]);
  useEffect(() => {
    setSelectedId(null);
    setReplyTo(null);
  }, [activeJid]);

  useChannel('WhatsappChannel', ({jid}) => {
    if (jid === activeJid) loadChat();
  });

  // An empty emoji removes our reaction. The webhook echo reloads the chat with the stored state.
  async function react(message, emoji) {
    setSelectedId(null);
    setMessages(prev => prev.map(m => m.id !== message.id ? m : {
      ...m,
      reactions: [...m.reactions.filter(r => !r.from_me), ...(emoji ? [{emoji, from_me: true}] : [])],
    }));
    try {
      await api.post('/whatsapp/chats/' + message.chat_jid + '/react', {message_id: message.id, emoji});
    } catch (error) {
      console.warn('Reacting failed', error);
      loadChat();
    }
  }

  function startReply(message) {
    setSelectedId(null);
    setReplyTo(message);
  }

  // Shaped like the `quoted` the show endpoint returns, so the bubble renders it before the reload.
  function quotedFor(message) {
    return message && {id: message.id, sender_name: message.sender_name ?? 'You', from_me: message.from_me, kind: message.kind, body: message.body};
  }

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
    const quoted = replyTo;
    setMessages(prev => [...prev, {
      id: localId,
      chat_jid: jid,
      from_me: true,
      kind: picked.kind === 'video' ? 'videoMessage' : 'imageMessage',
      body: caption,
      media: {width: picked.width, height: picked.height},
      local_uri: picked.uri,
      quoted_id: quoted?.id,
      quoted: quotedFor(quoted),
      sent_at: new Date().toISOString(),
      status: 1,
      reactions: [],
    }]);
    setAttachment(null);
    setMessageInput('');
    setReplyTo(null);

    let update;
    try {
      const file = picked.file ?? {uri: picked.uri, name: picked.name, type: picked.type};
      const sent = await api.upload('/whatsapp/chats/' + jid + '/send_media', {file, caption: caption || null, quote_id: quoted?.id ?? null});
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
    const quoted = replyTo;
    const sent = await api.post('/whatsapp/chats/' + jid + '/send', {text, quote_id: quoted?.id});

    // The send endpoint only returns {id, chat, sent_at}; build a message
    // in the same shape as the index endpoint so it renders like the rest.
    setMessages(prev => [...prev, {
      id: sent.id,
      chat_jid: jid,
      from_me: true,
      kind: 'text',
      body: text,
      quoted_id: quoted?.id,
      quoted: quotedFor(quoted),
      sent_at: sent.sent_at,
      status: 'sent',
      reactions: [],
    }]);
    setMessageInput('');
    setReplyTo(null);
  }

  return (
    // The floating navigation sits behind the keyboard, so while it is open only the keyboard needs clearing.
    <View style={[styles.content, {paddingBottom: keyboardHeight > 0 ? keyboardHeight + 8 : bottomInset}]}>
      {compact && (
        <View style={styles.chatListing}>
          <Pressable onPress={() => set("whatsapp.activeJid", null)} style={styles.backButton}>
            {NavigationBlur != null && <NavigationBlur pointerEvents="none" style={StyleSheet.absoluteFill} />}
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
          <Message
            key={index}
            message={message}
            selected={selectedId === message.id}
            onSelect={() => setSelectedId(message.id)}
            onDeselect={() => setSelectedId(null)}
            onReact={emoji => react(message, emoji)}
            onReply={() => startReply(message)}
            showSender={chat.is_group}
          />
        ))}
      </ScrollView>

      {replyTo && (
        <View style={styles.attachment}>
          <View style={styles.replyPreview}>
            <Text style={styles.replySender}>Replying to {replyTo.from_me ? 'yourself' : replyTo.sender_name}</Text>
            <Text style={styles.attachmentName} numberOfLines={1}>{replyTo.body || replyTo.kind}</Text>
          </View>
          <Pressable onPress={() => setReplyTo(null)}>
            <Icon name="cross" size={16} color={styles.attachmentName.color} />
          </Pressable>
        </View>
      )}

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
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  contactDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    padding: 8,
    borderRadius: 64,
    overflow: 'hidden',
  },
  backButton: {
    padding: 8,
    borderRadius: 64,
    overflow: 'hidden',
  },

  chatName: {
    fontSize: 16,
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
  replyPreview: {
    flex: 1,
    gap: 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 8,
  },
  replySender: {
    fontWeight: 'bold',
    color: colors.primary,
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
    color: colors.onSurface,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  messagesContainer: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
});
