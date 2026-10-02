import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useMemo, useState} from 'react';
import {WEEKDAYS, addMonths, dayKey, dayLabel, groupByDay, isSameDay, monthGrid, monthRange, monthTitle, startOfDay} from './dates';
import {glass, useThemedStyles} from '../theme';

import {EventForm} from './EventForm';
import {EventRow} from './EventRow';
import {Icon} from '../icons';
import {api} from '../api';
import {useCompactLayout} from '../useCompactLayout';

export function MonthView() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const [month, setMonth] = useState(() => addMonths(new Date(), 0));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const {from, to} = monthRange(month);
    api.get(`/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`).then(setEvents);
  }, [month]);

  const byDay = useMemo(() => groupByDay(events), [events]);
  const grid = useMemo(() => monthGrid(month), [month]);
  const today = startOfDay(new Date());
  const selectedEvents = byDay[dayKey(selected)] ?? [];

  const calendar = (
    <View style={styles.calendar}>
      <View style={styles.header}>
        <Pressable onPress={() => setMonth(addMonths(month, -1))} hitSlop={8}>
          <Icon name="chevron-left" size={20} color={styles.nav.color} />
        </Pressable>
        <Pressable onPress={() => { setMonth(addMonths(new Date(), 0)); setSelected(today); }}>
          <Text style={styles.monthTitle}>{monthTitle(month)}</Text>
        </Pressable>
        <Pressable onPress={() => setMonth(addMonths(month, 1))} hitSlop={8}>
          <Icon name="chevron-right" size={20} color={styles.nav.color} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map(day => <Text key={day} style={styles.weekday}>{day}</Text>)}
      </View>

      {Array.from({length: 6}, (_, week) => (
        <View key={week} style={styles.week}>
          {grid.slice(week * 7, week * 7 + 7).map(day => {
            const inMonth = day.getMonth() === month.getMonth();
            const isSelected = isSameDay(day, selected);
            const isToday = isSameDay(day, today);
            return (
              <Pressable key={day.toISOString()} onPress={() => setSelected(day)} style={[styles.day, isSelected && styles.daySelected, isToday && !isSelected && styles.dayToday]}>
                <Text style={[styles.dayNumber, !inMonth && styles.dayMuted, isSelected && styles.dayNumberSelected]}>{day.getDate()}</Text>
                <View style={styles.dots}>
                  {(byDay[dayKey(day)] ?? []).slice(0, 3).map((event, i) => (
                    <View key={i} style={[styles.dot, event.color ? {backgroundColor: event.color} : null, isSelected && styles.dotSelected]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );

  const details = (
    <View style={styles.details}>
      <Text style={styles.cardTitle}>{dayLabel(selected)}</Text>
      <ScrollView style={styles.list}>
        {selectedEvents.length === 0 && <Text style={styles.empty}>Nothing planned.</Text>}
        {selectedEvents.map(event => (
          <EventRow key={event.id} event={event} onDelete={gone => setEvents(current => current.filter(e => e.id !== gone.id))} />
        ))}
      </ScrollView>
      <EventForm day={selected} onCreate={created => setEvents(current => [...current, created])} />
    </View>
  );

  if (compact) {
    return (
      <ScrollView contentContainerStyle={styles.compactStack}>
        {calendar}
        {details}
      </ScrollView>
    );
  }

  return (
    <View style={styles.split}>
      {calendar}
      {details}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  split: {flex: 1, flexDirection: 'row', gap: 16, paddingTop: 16},
  compactStack: {gap: 16, paddingTop: 16, paddingBottom: 120},
  calendar: {flex: 3, ...glass(colors), borderRadius: 16, padding: 16},
  details: {flex: 2, ...glass(colors), borderRadius: 16, padding: 16, minHeight: 320},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  nav: {color: colors.primary},
  monthTitle: {fontSize: 18, fontWeight: 'bold', color: colors.onSurface},
  week: {flexDirection: 'row'},
  weekday: {flex: 1, textAlign: 'center', fontSize: 12, color: colors.outline, marginBottom: 6},
  day: {flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, margin: 2},
  daySelected: {backgroundColor: colors.primary},
  dayToday: {borderWidth: 1.5, borderColor: colors.primary},
  dayNumber: {fontSize: 14, color: colors.onSurface},
  dayNumberSelected: {color: colors.onPrimary, fontWeight: 'bold'},
  dayMuted: {color: colors.outline, opacity: 0.5},
  dots: {flexDirection: 'row', gap: 2, height: 6, marginTop: 2},
  dot: {width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary},
  dotSelected: {backgroundColor: colors.onPrimary},
  cardTitle: {fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: colors.onSurface},
  list: {flex: 1},
  empty: {fontSize: 14, color: colors.onSurfaceVariant},
});
