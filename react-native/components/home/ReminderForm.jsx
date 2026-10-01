import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {api} from '../api';

export function ReminderForm({onCreate}) {
  const styles = useThemedStyles(createStyles);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  async function submit() {
    const reminder = await api.post('/reminders', {
      title: title.trim(),
      description: description.trim() || null
    });
    setTitle('');
    setDescription('');
    onCreate(reminder);
  }

  return (
    <View style={styles.form}>
      <TextInput
        style={styles.input}
        placeholder="Remind me to..."
        placeholderTextColor={styles.placeholder.color}
        enableFocusRing={false}
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={submit}
        returnKeyType="done"
      />
      <TextInput
        style={styles.input}
        placeholder="Details (optional)"
        placeholderTextColor={styles.placeholder.color}
        enableFocusRing={false}
        value={description}
        onChangeText={setDescription}
      />
        <Pressable style={[styles.button]} onPress={submit}>
          <Text style={styles.buttonText}>Add</Text>
        </Pressable>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  form: {gap: 8, marginTop: 8},
  row: {flexDirection: 'row', gap: 8, alignItems: 'center'},
  input: {
    padding: 8,
    borderRadius: 8,
    color: colors.onSurface,
    ...glass(colors, {variant: 'subtle'}),
  },
  date: {flex: 1},
  placeholder: {color: colors.outline},
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    ...glass(colors, {variant: 'accent'}),
  },
  buttonDisabled: {opacity: 0.5},
  buttonText: {
    color: colors.onPrimary,
    fontWeight: 'bold',
  },
  error: {
    color: colors.error,
    fontSize: 12,
  },
});
