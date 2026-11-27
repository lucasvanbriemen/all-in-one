import {Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useState} from 'react';
import {surfaceStyle, useThemedStyles} from '../theme';

import {useAppContext} from '../../context/AppContext';
import {Avatar} from './Avatar';
import {api} from '../api';

const CAN_HOVER = Platform.OS === 'web' || Platform.OS === 'macos';

export const ChannelListItem = React.memo(function ChannelListItem({channel}) {
  const styles = useThemedStyles(createStyles);

  const {get, set} = useAppContext();
  const [hovered, setHovered] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  // Hidden chats leave the list but stay findable through search; the list refreshes over the socket.
  function dismiss() {
    setActionsOpen(false);
    api.post(`/channels/${encodeURIComponent(channel.id)}/dismiss`, {dismissed: true})
      .catch(error => console.warn(`hiding ${channel.id} failed`, error));
  }

  function openChannel(channel) {
    set('messages.activeChannel', channel.id);
    set("messages.activeThread", null)
    channel.unread_count = 0;
  }

  function isSelected() {
    return get('messages.activeChannel') === channel.id;
  }

  return (
    <Pressable key={channel.id} onPress={() => openChannel(channel)} onLongPress={() => setActionsOpen(open => !open)} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} style={[styles.channelItem, isSelected() && styles.channelItem.selected, isSelected() && styles.channelItem.selectedParrent, channel.unread_count > 0 && styles.channelItem.unread]}>
      <Avatar uri={channel.avatar_url} name={channel.display_name} size={32} style={{marginRight: 8}} />

      <View style={styles.channelItem.textContainer}>
        <Text style={[styles.channelItem.name, isSelected() && styles.channelItem.selected, channel.unread_count > 0 && styles.channelItem.unread]}>{channel.display_name}</Text>
        <Text style={[styles.channelItem.lastMessage, isSelected() && styles.channelItem.selected, channel.unread_count > 0 && styles.channelItem.unread]} numberOfLines={1}>
          {channel.last_message_author && <Text style={styles.channelItem.author}>{channel.last_message_author}: </Text>}
          {channel.last_message_preview}
        </Text>
      </View>

      {((CAN_HOVER && hovered) || actionsOpen) && (
        <Pressable onPress={dismiss} hitSlop={8} style={styles.hide}>
          <Text style={styles.hideText}>Hide</Text>
        </Pressable>
      )}
    </Pressable>
  );
});

const createStyles = colors => StyleSheet.create({
  hide: {
    ...surfaceStyle(colors),
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hideText: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  channelItem: {
    padding: 16,
    ...surfaceStyle(colors),
    borderRadius: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,

    textContainer: {
      flex: 1,
    },

    name: {
      fontSize: 16,
      fontWeight: 500,
      color: colors.onSurface,
    },

    lastMessage: {
      marginTop: 4,
      opacity: 0.7,
      color: colors.onSurface,
    },

    author: {
      fontWeight: 600,
    },

    selected: {
      backgroundColor: colors.primaryContainer,
      color: colors.onPrimaryContainer,
    },

    selectedParrent: {
      borderWidth: 2,
      padding: 15,
      borderColor: colors.primary,
      borderTopColor: colors.primary,
    },

    unread: {
      backgroundColor: colors.secondaryContainer,
      color: colors.onSecondaryContainer,
    }
  },
});
