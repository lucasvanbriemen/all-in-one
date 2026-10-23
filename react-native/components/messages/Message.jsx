import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useTheme, useThemedStyles} from '../theme';

import {format} from '../money/format';
import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from '../useCompactLayout';

export function Message({message, showSender = false}) {
  const compact = useCompactLayout();
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const {get} = useAppContext();

  return (
    <View style={[styles.chatContainer, message.from_me && styles.from_me]}>

      {showSender && !message.from_me && (
        <Text style={styles.sender}>{message.sender_name}</Text>
      )}

      <View style={styles.body}>
        <Text style={styles.content}>{message.body}</Text>
        <View style={styles.meta}>
          <Text style={styles.timestamp}>{format.time(message.sent_at)}</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  chatListing: {
    flex: 1,
  },
  content: {
    gap: 16,
    flex: 2,
  },
  chatName: {
    fontSize: 16,
  },
  sender: {
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  chatContainer: {
    marginTop: 8,
    ...glass(colors),
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    maxWidth: '75%',
    gap: 8,
  },
  body: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 8,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    marginRight: 16,
  },
  from_me: {
    backgroundColor: colors.primaryContainer,
    alignSelf: 'flex-end',
  },
  content: {
    color: colors.onSurface,
  },
  meta: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.75,
    color: colors.onSurfaceVariant
  },
});
