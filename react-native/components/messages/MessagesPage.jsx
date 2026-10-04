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
            <Text>{chat.name}: ({chat.unread_count})</Text>
            <Text>Last message: {chat.last_message?.body ?? 'No messages'}</Text>
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
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
});
