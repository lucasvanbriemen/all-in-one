import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useState} from 'react';

import {api} from '../api';

export function ReminderForm({onCreate}) {
  const styles = createStyles();
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
      <TextInput style={styles.input} placeholder="Remind me to..." placeholderTextColor={styles.placeholder.color} enableFocusRing={false} value={title} onChangeText={setTitle}/>
      <Pressable style={[styles.button]} onPress={submit}>
        <Text style={styles.buttonText}>Add</Text>
      </Pressable>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  form: {
    gap: 8,
    marginTop: 8,
    flexDirection: 'row',
  },
  input: {
    padding: 8,
    flex: 1,
    borderRadius: 8,
  },
  placeholder: {
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  buttonText: {
  },
});
