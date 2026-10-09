import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {MediaPlayer} from './MediaPlayer';
import {format} from '../money/format';
import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from '../useCompactLayout';

export function Message({message}) {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const {get} = useAppContext();
  const {width, height} = message.media || {};
  const [mediaAspectRatio, setMediaAspectRatio] = useState(width && height ? width / height : 3 / 2);
  const mediaUri = `${BASE_URL}/${message.media_url}`;

  return (
    <View style={[styles.chatContainer, message.from_me && styles.from_me]}>

      {message.kind === "imageMessage" || message.kind === "stickerMessage" && (
        <>
          <Image
            source={{uri: `${BASE_URL}/${message.media_url}`}}
            style={[styles.media, {aspectRatio: mediaAspectRatio}]}
            onLoad={({nativeEvent: {source}}) => setMediaAspectRatio(source.width / source.height)}
          />
        </>
      )}

      {message.kind === "videoMessage" && message.media_url && (
        <MediaPlayer
          kind="video"
          uri={mediaUri}
          style={[styles.media, {aspectRatio: mediaAspectRatio}]}
          onAspectRatio={setMediaAspectRatio}
        />
      )}

      {message.kind === "audioMessage" && message.media_url && (
        <MediaPlayer kind="audio" uri={mediaUri} style={styles.audio} />
      )}

      <Text style={styles.content}>{message.body}</Text>
      <Text style={styles.timestamp}>{format.time(message.sent_at)}</Text>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  chatListing: {
    flex: 1,
  },
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    maxWidth: '75%',
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
  from_me: {
    backgroundColor: colors.primaryContainer,
    alignSelf: 'flex-end',
  },
  content: {
    color: colors.onSurface,
  },
  timestamp: {
    marginLeft: 'auto',
    fontSize: 11,
    opacity: 0.75,
    color: colors.onSurfaceVariant
  },
  media: {
    width: 300,
    borderRadius: 16,
    overflow: 'hidden',
  },
  audio: {
    width: 300,
    height: 54,
  },
});
