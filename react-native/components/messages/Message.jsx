import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useTheme, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import {MediaPlayer} from './MediaPlayer';
import {format} from '../money/format';
import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from '../useCompactLayout';

const STATUS_INDICATORS = {
  0: 'failed',
  1: 'not_sent',
  2: 'sent_not_received',
  3: 'received',
  4: 'read',
  5: 'read',
};

// `color` names a theme color; null falls back to the grey timestamp color.
const STATUS_ICONS = {
  failed: {icon: 'alert', color: 'error'},
  not_sent: {icon: 'clock', color: null},
  sent_not_received: {icon: 'check', color: null},
  received: {icon: 'check-double', color: null},
  read: {icon: 'check-double', color: 'primary'},
};

export function Message({message}) {
  const compact = useCompactLayout();
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const {get} = useAppContext();
  const {width, height} = message.media || {};
  const [mediaAspectRatio, setMediaAspectRatio] = useState(width && height ? width / height : 3 / 2);
  const mediaUri = `${BASE_URL}/${message.media_url}`;
  const indicator = STATUS_ICONS[STATUS_INDICATORS[message.status]];

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
      <View style={styles.meta}>
        <Text style={styles.timestamp}>{format.time(message.sent_at)}</Text>
        {message.from_me && indicator && (
          <Icon name={indicator.icon} size={16} color={colors[indicator.color] || styles.timestamp.color} />
        )}
      </View>
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
