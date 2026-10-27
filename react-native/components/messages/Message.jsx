import {BASE_URL, api} from '../api';
import {Image, Linking, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useTheme, useThemedStyles} from '../theme';

import FileUpload from './FileUpload';
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
        <View style={styles.senderContainer}>
          <Image source={{uri: message.contact.avatar_url}} style={styles.avatar} />
          <Text style={styles.sender}>{message.contact.name}</Text>
        </View>
      )}

      {message.file_uploads?.length > 0 && (
        <View style={styles.files}>
          {message.file_uploads.map(file => <FileUpload key={file.id} file={file} />)}
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.content}>{message.body}</Text>
        <View style={styles.meta}>
          <Text style={styles.timestamp}>{format.time(message.created_at)}</Text>
        </View>

        {message.reply_count > 0 && (
          <Text style={styles.replyCount}>{message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}</Text>
        )}
      </View>

      {message.reactions && message.reactions.length > 0 && (
        <View style={styles.reactions}>
          {message.reactions.map(reaction => (
            <Text key={reaction.id}>{reaction.reaction}</Text>
          ))}
        </View>
      )}
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
    color: colors.primary
  },
  chatContainer: {
    marginTop: 8,
    ...glass(colors),
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    maxWidth: '75%',
    position: 'relative',
    gap: 8,
  },
  body: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 25,
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
  reactions: {
    position: 'absolute',
    bottom: -16,
    ...glass(colors),
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    right: 8,
  },
  senderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  }
});
