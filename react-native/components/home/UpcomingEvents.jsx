import {StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {EventRow} from '../calendar/EventRow';
import {api} from '../api';

export function UpcomingEvents() {
  const styles = useThemedStyles(createStyles);
  const [events, setEvents] = useState(null);

  useEffect(() => {
    api.get('/calendar/events/upcoming?limit=4').then(setEvents).catch(() => setEvents([]));
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Coming up</Text>
      {events && events.length === 0 && <Text style={styles.empty}>Nothing on the calendar.</Text>}
      {events && events.map(event => <EventRow key={event.id} event={event} showDate />)}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  card: {...glass(colors), padding: 16, borderRadius: 16},
  cardTitle: {fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: colors.onSurface},
  empty: {fontSize: 14, color: colors.onSurfaceVariant},
});
