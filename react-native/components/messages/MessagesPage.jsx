import {BASE_URL, api} from '../api';
import {Image, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {Stat} from '../home/Stat';
import {format} from './format';
import {useCompactLayout} from '../useCompactLayout';

export function MessagesPage() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    api.get('/whatsapp/chats').then(response => {
      setChats(response);
    });
  }, []);

  return (
    <View style={styles.content}>
      <ScrollView>
        {chats && chats?.map((chat, index) => (
          <View key={index} style={styles.chatContainer}>
            <Image source={{uri: BASE_URL + chat.avatar_url}} style={styles.avatar} />
            
            <View>
              <Text style={styles.chatName}>{chat.name}: ({chat.unread_count})</Text>
              <Text style={styles.lastMessage}>Last message: {chat.last_message?.body ?? 'No messages'}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  compactStats: { flexWrap: 'wrap', gap: 8 },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
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
});
