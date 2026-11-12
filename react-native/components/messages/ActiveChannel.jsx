import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout, useKeyboardHeight} from '../useCompactLayout';
import {Icon} from '../icons';
import {NavigationBlur} from '../sidebar/NavigationBlur';

import {Message} from './Message';
import {MessageInput} from './MessageInput';
import {useAppContext} from '../../context/AppContext';
import {useChannel} from '../cable';

export function ActiveChannel({isThread = false}) {
  const styles = useThemedStyles(createStyles);
  const [messages, setMessages] = useState([]);
  const [channel, setChannel] = useState({});
  const {set, get} = useAppContext();
  const isCompact = useCompactLayout();
  const bottomInset = useBottomInset();
  const keyboardHeight = useKeyboardHeight();
  const colors = useThemedStyles(c => c);
  const inputOffset = keyboardHeight > 0 ? keyboardHeight + 8 : bottomInset;

  // Keep the chat pinned to the newest message while the user is at the bottom
  // (opening a channel, new messages, images loading). Scrolling up releases it.
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);

  function handleScroll({nativeEvent}) {
    const {contentOffset, contentSize, layoutMeasurement} = nativeEvent;
    stickToBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
  }

  function handleContentSizeChange() {
    if (stickToBottom.current) scrollRef.current?.scrollToEnd({animated: false});
  }

  const [activeChannel, setActiveChannel] = useState(get("messages.activeChannel") ?? "");

  useEffect(() => {
    setActiveChannel(get("messages.activeChannel") ?? "");
  }, [get]);

  function loadChats(messagePage = 1) {
    if (!activeChannel) return;
    if (messagePage === 1) stickToBottom.current = true;

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

  function closeChannel() {
    setActiveChannel("");
    set("messages.activeChannel", "");
  }

  useEffect(loadChats, []);
  useEffect(loadChats, [activeChannel]);

  // Something in the open chat changed: refetch the newest page (or the whole thread)
  // and swap it in, keeping any older pages already loaded above it.
  function refreshChat() {
    const messageRoute = isThread ? `/channels/${activeChannel}/messages/${get("messages.activeThread")}/replies` : `/channels/${activeChannel}/messages`;

    api.get(messageRoute).then(response => {
      setMessages(current => {
        if (isThread || response.length === 0) return response;

        const oldest = Date.parse(response[0].created_at);
        return [...current.filter(message => Date.parse(message.created_at) < oldest), ...response];
      });
    });
  }

  useChannel('MessagesChannel', event => {
    if (activeChannel && event.channel_id === activeChannel) refreshChat();
  });

  return (
    <View style={styles.content}>
      {isCompact && (
        <View style={styles.channelDetails}>
          <Pressable onPress={() => closeChannel()} style={styles.backButton}>
            {NavigationBlur != null && <NavigationBlur pointerEvents="none" style={StyleSheet.absoluteFill} />}
            <Icon name={"chevron-left"} size={16} color={colors.onSurface} />
          </Pressable>

          <View style={styles.channelInfo}>
            {NavigationBlur != null && <NavigationBlur pointerEvents="none" style={StyleSheet.absoluteFill} />}
            <Image source={{uri: channel?.avatar_url}} style={styles.avatar} />
            <Text style={styles.channelInfo.name}>{channel?.display_name}</Text>
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.chatListing}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
      >
        <Pressable onPress={() => loadChats(Math.floor(messages.length / 50) + 1)}>
          <Text style={styles.loadMore}>Load More</Text>
        </Pressable>

        {messages.map(message => (
          <Message key={message.id} message={message} showSender={!channel?.is_dm} />
        ))}
      </ScrollView>

      <View style={[styles.additionalContent, { marginBottom: inputOffset }]}>
        <MessageInput threadId={isThread ? get("messages.activeThread") : null} />
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  backButton: {
    padding: 8,
    overflow: 'hidden',
    borderRadius: 100,
    height: 53,
    width: 53,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 100,
    overflow: 'hidden',
    flex: 1,

    name: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.onSurface,
    }
  },
  chatListing: {
    flex: 1,
  },
  additionalContent: {
    marginBottom: 16,
  },
  channelDetails: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
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
