import {ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useMemo, useState} from 'react';
import {addDays, dayKey, dayLabel, groupByDay, startOfDay} from './dates';
import {glass, useThemedStyles} from '../theme';

import {EventRow} from './EventRow';
import {api} from '../api';

const DAYS_AHEAD = 30;

export function AgendaView() {
  const styles = useThemedStyles(createStyles);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const from = startOfDay(new Date());
    const to = addDays(from, DAYS_AHEAD);
    api.get(`/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`).then(setEvents);
  }, []);

  const days = useMemo(() => {
    const byDay = groupByDay(events);
    const start = startOfDay(new Date());
    return Array.from({length: DAYS_AHEAD}, (_, i) => addDays(start, i))
      .map(day => ({day, events: byDay[dayKey(day)] ?? []}))
      .filter(entry => entry.events.length > 0);
  }, [events]);

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {days.length === 0 && <Text style={styles.empty}>Nothing in the next {DAYS_AHEAD} days.</Text>}
      {days.map(({day, events: dayEvents}) => (
        <View key={dayKey(day)} style={styles.group}>
          <Text style={styles.dayTitle}>{dayLabel(day)}</Text>
          {dayEvents.map(event => (
            <EventRow key={event.id} event={event} onDelete={gone => setEvents(current => current.filter(e => e.id !== gone.id))} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = colors => StyleSheet.create({
  list: {paddingTop: 16, paddingBottom: 120, gap: 16},
  group: {...glass(colors), borderRadius: 16, padding: 16},
  dayTitle: {fontSize: 16, fontWeight: 'bold', color: colors.onSurface, marginBottom: 8},
  empty: {fontSize: 14, color: colors.onSurfaceVariant},
});
