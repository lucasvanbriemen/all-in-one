import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import React from 'react';
import {SnowCap} from './SnowCap';
import {useAppContext} from '../../context/AppContext';
import {useSeasonalData} from './data';
import {useSeason} from './useSeason';

/**
 * Santa's list, from your own inbox and chats. Naughty: whoever buried you in
 * Black Friday and Christmas promo mail. Nice: the people you actually talk to.
 */
export function NaughtyNiceCard() {
  const styles = useThemedStyles(createStyles);
  const {set} = useAppContext();
  const [list] = useSeasonalData('/seasonal/naughty_nice');

  function openChat(channelId) {
    set('app.activeApp', 'messages');
    set('app.activeSidebarItem', 'whatsapp');
    set('messages.activeChannel', channelId);
  }

  return (
    <View style={styles.card}>
      <SnowCap />
      <View style={styles.column}>
        <Text style={styles.title}>📜 Naughty</Text>
        {(list?.naughty ?? []).map(entry => (
          <Text key={entry.email ?? entry.name} style={styles.row} numberOfLines={1}>
            🪨 {entry.name} <Text style={styles.count}>· {entry.count}</Text>
          </Text>
        ))}
        {list && list.naughty?.length === 0 && <Text style={styles.empty}>Nobody spammed you. Suspicious.</Text>}
      </View>
      <View style={styles.column}>
        <Text style={styles.title}>😇 Nice</Text>
        {(list?.nice ?? []).map(entry => (
          <Pressable key={entry.channel_id ?? entry.name} onPress={() => entry.channel_id && openChat(entry.channel_id)}>
            <Text style={styles.row} numberOfLines={1}>
              ⭐ {entry.name} <Text style={styles.count}>· {entry.count}</Text>
            </Text>
          </Pressable>
        ))}
        {list && list.nice?.length === 0 && <Text style={styles.empty}>Go talk to someone.</Text>}
      </View>
    </View>
  );
}

/**
 * The naughty senders' names, for the email list to hand out coal. Empty out
 * of season, so the list never shows it.
 */
export function useNaughtySenders() {
  const {decorated} = useSeason(10 * 60_000);
  const [list] = useSeasonalData('/seasonal/naughty_nice', decorated);
  if (!decorated || !list) return EMPTY;
  return new Set((list.naughty ?? []).map(entry => entry.name));
}

const EMPTY = new Set();

const createStyles = colors =>
  StyleSheet.create({
    card: {
      ...glass(colors),
      borderRadius: 16,
      padding: 12,
      flexDirection: 'row',
      gap: 12,
      flex: 1.4,
    },
    column: {flex: 1, gap: 4, minWidth: 0},
    title: {fontSize: 16, fontWeight: 'bold', color: colors.onSurface, marginBottom: 4},
    row: {fontSize: 14, color: colors.onSurfaceVariant},
    count: {color: colors.outline},
    empty: {fontSize: 13, color: colors.outline},
  });
