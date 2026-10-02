import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import React from 'react';
import {api} from '../api';
import {timeLabel} from './dates';

export function EventRow({event, onDelete, showDate = false}) {
  const styles = useThemedStyles(createStyles);

  async function remove() {
    await api.makeRequest('DELETE', `/calendar/events/${event.id}`);
    onDelete?.(event);
  }

  const when = event.all_day
    ? 'All day'
    : `${timeLabel(event.starts_at)} – ${timeLabel(event.ends_at)}`;

  return (
    <View style={styles.row}>
      <View style={[styles.bar, event.color ? {backgroundColor: event.color} : null]} />
      <View style={styles.text}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>
          {showDate ? `${new Date(event.starts_at).toLocaleDateString('en-GB', {weekday: 'short', day: '2-digit', month: 'short'})} · ` : ''}
          {when}{event.location ? ` · ${event.location}` : ''}{event.calendar_name ? ` · ${event.calendar_name}` : ''}
        </Text>
        {event.description ? <Text style={styles.body} numberOfLines={3}>{event.description}</Text> : null}
      </View>
      {onDelete && (
        <Pressable onPress={remove} hitSlop={8}>
          <Icon name="cross" size={20} color={styles.remove.color} />
        </Pressable>
      )}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  row: {
    ...glass(colors, {variant: 'subtle'}),
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  bar: {width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.primary},
  text: {flex: 1},
  title: {fontSize: 16, fontWeight: 'bold', color: colors.onSurface},
  meta: {fontSize: 12, color: colors.outline, marginTop: 2},
  body: {fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4},
  remove: {color: colors.primary},
});
