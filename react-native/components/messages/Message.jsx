import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useTheme, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import {MediaPlayer} from './MediaPlayer';
import {format} from '../money/format';
import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from '../useCompactLayout';

// Same emoji from several people collapses into one chip with a count.
function groupReactions(reactions) {
  const groups = [];
  for (const reaction of reactions) {
    const group = groups.find(g => g.emoji === reaction.emoji);
    if (group) {
      group.count++;
      group.mine ||= reaction.from_me;
    } else {
      groups.push({emoji: reaction.emoji, count: 1, mine: Boolean(reaction.from_me)});
    }
  }
  return groups;
}

export function Message({message, selected, onSelect, onDeselect, showSender = false}) {
  const compact = useCompactLayout();
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const {get} = useAppContext();
  const {width, height} = message.media || {};
  const [mediaAspectRatio, setMediaAspectRatio] = useState(width && height ? width / height : 3 / 2);
  const mediaUri = message.local_uri ?? (message.media_url && `${BASE_URL}/${message.media_url}`);
  const reactions = groupReactions(message.reactions ?? []);
  // Messages still uploading have no WhatsApp id to point at yet.
  const actionable = !message.deleted && !String(message.id).startsWith('local-');

  return (
    <View style={[styles.chatContainer, message.from_me && styles.from_me, selected && styles.selected]}>

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
  lastMessage: {
    color: colors.secondary,
    fontSize: 14,
    marginTop: 4,
  },
  quoted: {
    backgroundColor: colors.surfaceAt1,
    padding: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  sender: {
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  quotedSender: {
    fontWeight: 'bold',
    color: colors.onSurface,
    marginBottom: 4,
  },
  quotedContent: {
    color: colors.onSurfaceVariant,
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
  reactions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,

    position: 'absolute',
    bottom: -25,
    left: 8,
    backgroundColor: colors.surfaceAt1,
    padding: 8,
    borderRadius: 16,
  },
  reaction: {
    fontSize: 14,
    color: colors.onSurface,
  },
  reactionMine: {
    fontWeight: 'bold',
  },
  selected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 8,
    padding: 4,
    borderRadius: 20,
    ...glass(colors),
  },
  actionsFromMe: {
    alignSelf: 'flex-end',
  },
  action: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 16,
  },
  actionActive: {
    backgroundColor: colors.primaryContainer,
  },
  actionEmoji: {
    fontSize: 20,
  },
  actionLabel: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
