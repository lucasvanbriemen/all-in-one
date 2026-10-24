import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {useAppContext} from '../../context/AppContext';

export function ChannelListItem({channel}) {
  const styles = useThemedStyles(createStyles);

  const {get, set} = useAppContext();

  function openChannel(channel) {
    set('messages.activeChannel', channel.id);
  }

  function isSelected() {
    return get('messages.activeChannel') === channel.id;
  }

  return (
    <Pressable key={channel.id} onPress={() => openChannel(channel)} style={[styles.channelItem, isSelected() && styles.channelItem.selected]}>
      {channel.is_dm && (
        <Image source={{uri: channel.contact?.avatar_url}} style={{width: 32, height: 32, borderRadius: 16, marginRight: 8}} />
      )}

      <View style={styles.channelItem.textContainer}>
        <Text style={[styles.channelItem.name, isSelected() && styles.channelItem.selected]}>{channel.display_name}</Text>
        <Text style={[styles.channelItem.lastMessage, isSelected() && styles.channelItem.selected]}>{channel.last_message?.body}</Text>
      </View>
    </Pressable>
  );
}

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
    },

    lastMessage: {
      marginTop: 4,
      opacity: 0.7,
    },

    selected: {
      backgroundColor: colors.primary,
      color: colors.onPrimary,
    },
  },
});
