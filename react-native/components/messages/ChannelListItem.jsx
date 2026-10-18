import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {useAppContext} from '../../context/AppContext';

export function ChannelListItem({channel}) {
  const styles = useThemedStyles(createStyles);

  const {set} = useAppContext();

  function openChannel(channel) {
    set('messages.activeChannel', channel.id);
  }

  return (
    <Pressable key={channel.id} onPress={() => openChannel(channel)} style={styles.channelItem}>
      <Text>{channel.display_name}</Text>
      <Text>{channel.last_message?.body}</Text>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  channelItem: {
    padding: 16,
    ...glass(colors),
    borderRadius: 16,
    marginTop: 8,
  },
});
