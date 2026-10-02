import {Pressable, StyleSheet, Switch, Text, TextInput, View} from 'react-native';
import React, {useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {parseTime, startOfDay} from './dates';

import {api} from '../api';

export function EventForm({day, onCreate}) {
  const styles = useThemedStyles(createStyles);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [error, setError] = useState(null);

  function at(time) {
    const d = startOfDay(day);
    if (time) d.setHours(time.hours, time.minutes);
    return d;
  }

  async function submit() {
    if (!title.trim()) return;
    const startTime = parseTime(start);
    const endTime = parseTime(end);
    if (!allDay && (!startTime || !endTime)) {
      setError('Use HH:MM for the times');
      return;
    }

    const payload = {
      title: title.trim(),
      location: location.trim() || null,
      all_day: allDay,
      starts_at: (allDay ? at(null) : at(startTime)).toISOString(),
      ends_at: (allDay ? at({hours: 23, minutes: 59}) : at(endTime)).toISOString(),
    };

    try {
      const created = await api.post('/calendar/events', payload);
      setTitle('');
      setLocation('');
      setError(null);
      onCreate(created);
    } catch (e) {
      setError('Could not save the event');
    }
  }

  return (
    <View style={styles.form}>
      <TextInput style={styles.input} placeholder="New event" placeholderTextColor={styles.placeholder.color} enableFocusRing={false} value={title} onChangeText={setTitle} onSubmitEditing={submit} />
      <TextInput style={styles.input} placeholder="Location (optional)" placeholderTextColor={styles.placeholder.color} enableFocusRing={false} value={location} onChangeText={setLocation} />
      <View style={styles.row}>
        {!allDay && (
          <>
            <TextInput style={[styles.input, styles.time]} value={start} onChangeText={setStart} enableFocusRing={false} placeholder="09:00" placeholderTextColor={styles.placeholder.color} />
            <Text style={styles.dash}>–</Text>
            <TextInput style={[styles.input, styles.time]} value={end} onChangeText={setEnd} enableFocusRing={false} placeholder="10:00" placeholderTextColor={styles.placeholder.color} />
          </>
        )}
        <View style={styles.allDay}>
          <Text style={styles.label}>All day</Text>
          <Switch value={allDay} onValueChange={setAllDay} />
        </View>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Add event</Text>
      </Pressable>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  form: {gap: 8, marginTop: 8},
  row: {flexDirection: 'row', alignItems: 'center', gap: 8},
  input: {
    padding: 8,
    borderRadius: 8,
    color: colors.onSurface,
    ...glass(colors, {variant: 'subtle'}),
  },
  time: {width: 72, textAlign: 'center'},
  dash: {color: colors.outline},
  allDay: {flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto'},
  label: {color: colors.onSurfaceVariant, fontSize: 14},
  placeholder: {color: colors.outline},
  error: {color: colors.error, fontSize: 12},
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignSelf: 'flex-start',
  },
  buttonText: {color: colors.onPrimary},
});
