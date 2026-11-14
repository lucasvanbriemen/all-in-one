import {Pressable, StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {glass, useThemedStyles} from '../theme';

import {useAppContext} from '../../context/AppContext';
import {Avatar} from './Avatar';

export const ChannelListItem = React.memo(function ChannelListItem({channel}) {
  const styles = useThemedStyles(createStyles);

  const {get, set} = useAppContext();

  function openChannel(channel) {
    set('messages.activeChannel', channel.id);
    set("messages.activeThread", null)
    channel.unread_count = 0;
  }

  function isSelected() {
    return get('messages.activeChannel') === channel.id;
  }

  return (
    <Pressable key={channel.id} onPress={() => openChannel(channel)} style={[styles.channelItem, isSelected() && styles.channelItem.selected, isSelected() && styles.channelItem.selectedParrent, channel.unread_count > 0 && styles.channelItem.unread]}>
      <Avatar uri={channel.avatar_url} name={channel.display_name} size={32} style={{marginRight: 8}} />

      <View style={styles.channelItem.textContainer}>
        <Text style={[styles.channelItem.name, isSelected() && styles.channelItem.selected, channel.unread_count > 0 && styles.channelItem.unread]}>{channel.display_name}</Text>
        <Text style={[styles.channelItem.lastMessage, isSelected() && styles.channelItem.selected, channel.unread_count > 0 && styles.channelItem.unread]} numberOfLines={1}>{channel.last_message?.body}</Text>
      </View>
    </Pressable>
  );
});

const createStyles = colors => StyleSheet.create({
  channelItem: {
    padding: 16,
    ...glass(colors),
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
