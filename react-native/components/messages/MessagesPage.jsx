import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {Stat} from '../home/Stat';
import {api} from '../api';
import {format} from './format';
import {useCompactLayout} from '../useCompactLayout';
import {useThemedStyles} from '../theme';

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
          <View key={index}>
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
});
