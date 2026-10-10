import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {ActiveChat} from './ActiveChat';
import {useAppContext} from '../../context/AppContext';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';

export function MessagesPage() {
  const compact = useCompactLayout();
  const bottomInset = useBottomInset();
  const styles = useThemedStyles(createStyles);
  const [chats, setChats] = useState([]);
  const {set, get} = useAppContext();

  useEffect(() => {
    api.get('/whatsapp/chats').then(response => {
      setChats(response);
    });
  }, []);

  return (
    <View style={styles.content}>
      {(compact && !get("whatsapp.activeJid") || !compact) && (
        <> 
          <View style={styles.chatListing}>
            <ScrollView contentContainerStyle={{paddingBottom: bottomInset}}>
              {chats && chats?.map((chat, index) => (
                <Pressable key={index} style={[styles.chatContainer, chat.unread_count > 0 && styles.unreadChat, get("whatsapp.activeJid") === chat.jid && styles.activeChat]} onPress={() => set("whatsapp.activeJid", chat.jid)}>
                  <Avatar name={chat.name} url={chat.avatar_url} styles={styles} />
                  
                  <View>
                    <Text style={[styles.chatName, get("whatsapp.activeJid") === chat.jid && styles.activeChatName]}>{chat.name}</Text>
                    <Text style={[styles.lastMessage, get("whatsapp.activeJid") === chat.jid && styles.activeChatName]} lineBreakMode="tail" numberOfLines={1}>{chat.last_message?.body ?? 'No messages'}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </> 
      )}

      {get("whatsapp.activeJid") != null && <ActiveChat />}

      {get("whatsapp.activeJid") == null && !compact && (
        <View style={styles.additionalContent}>
          <Text>No additional content</Text>
        </View>
      )}
    </View>
  );
}

// Falls back to initials: not everyone has a profile picture, and WhatsApp hides pictures from non-contacts.
function Avatar({name, url, styles}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (url && !failed) {
    return <Image source={{uri: BASE_URL + url}} style={styles.avatar} onError={() => setFailed(true)} />;
  }

  const initials = (name || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?';
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitials}>{initials}</Text>
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
