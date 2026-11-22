import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {ActiveChannel} from './ActiveChannel';
import {ChannelListing} from './ChannelListing';
import {GreetingsChecklist} from '../seasonal/GreetingsChecklist';
import {useCompactLayout} from '../useCompactLayout';
import {useAppContext} from '../../context/AppContext';

export function MessagesPage() {
  const {get} = useAppContext();
  const sidebarItem = get("app.activeSidebarItem") ?? "whatsapp";
  const styles = useThemedStyles(createStyles);
  const compact = useCompactLayout();
  const thread = get("messages.activeThread");

  return (
    <View style={styles.content}>
      {(compact && !get("messages.activeChannel") || !compact) && (
        <View style={styles.channelListing}>
          {sidebarItem === 'whatsapp' && <GreetingsChecklist />}
          <ChannelListing type={sidebarItem} />
        </View>
      )}

      {(compact && get("messages.activeChannel") || !compact) && (
        <View style={styles.activeChannelWrapper}>
          {/* A small screen has room for one pane: an open thread replaces its chat. */}
          {!(compact && thread) && (
            <View style={styles.activeChannel}>
              <ActiveChannel />
            </View>
          )}

          {thread && (
            <View style={[styles.activeChannel, !compact && styles.activeChannelThread]}>
              <ActiveChannel isThread={true} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  activeChannelThread: {
    ...glass(colors),
    flex: 3,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  channelListing: {
    flex: 1,
  },
  activeChannel: {
    flex: 4,
    marginVertical: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  activeChannelWrapper: {
    flex: 2,
    flexDirection: 'row'
  },
});
