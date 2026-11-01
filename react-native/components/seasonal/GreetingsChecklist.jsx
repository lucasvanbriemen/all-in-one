import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect} from 'react';
import {glass, useThemedStyles} from '../theme';

import {onEffect} from './store';
import {useAppContext} from '../../context/AppContext';
import {useSeason} from './useSeason';
import {useSeasonalData} from './data';

/**
 * Christmas Eve to Boxing Day: the people you talked to this year that you
 * haven't wished a merry Christmas yet. Each one ticks itself off once you
 * send them something festive.
 */
export function GreetingsChecklist() {
  const styles = useThemedStyles(createStyles);
  const {decorated, phase} = useSeason();
  const {set, get} = useAppContext();
  const enabled = decorated && phase === 'christmas';
  const [data, reload] = useSeasonalData('/seasonal/greetings', enabled);

  // A festive message was just sent: give the server a moment to store it,
  // then re-check who's been greeted.
  useEffect(
    () =>
      onEffect(effect => {
        if (effect.type === 'burst' && effect.source === 'message') setTimeout(reload, 2500);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!enabled || !data?.contacts?.length) return null;

  const contacts = [...data.contacts].sort((a, b) => Number(a.greeted) - Number(b.greeted));
  const done = contacts.filter(contact => contact.greeted).length;
  const active = get('messages.activeChannel');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Fijne feestdagen 🎄</Text>
      <Text style={styles.subtitle}>
        {done === contacts.length ? 'Everyone wished. Well done.' : `${done} of ${contacts.length} wished`}
      </Text>
      <ScrollView style={styles.list}>
        {contacts.map(contact => (
          <Pressable
            key={contact.channel_id}
            onPress={() => set('messages.activeChannel', contact.channel_id)}
            style={[styles.row, active === contact.channel_id && styles.rowActive]}>
            <Text style={styles.check}>{contact.greeted ? '✅' : '⬜️'}</Text>
            <Text style={[styles.name, contact.greeted && styles.nameDone]} numberOfLines={1}>
              {contact.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    card: {
      ...glass(colors, {variant: 'tinted', tone: 'primaryContainer'}),
      borderRadius: 16,
      padding: 12,
      marginTop: 16,
      gap: 4,
    },
    title: {fontSize: 16, fontWeight: 'bold', color: colors.onSurface},
    subtitle: {fontSize: 13, color: colors.onSurfaceVariant, marginBottom: 4},
    list: {maxHeight: 200},
    row: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 8},
    rowActive: {backgroundColor: colors.primaryContainer},
    check: {fontSize: 14},
    name: {flex: 1, fontSize: 14, color: colors.onSurface},
    nameDone: {color: colors.outline, textDecorationLine: 'line-through'},
  });
