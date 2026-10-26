import {BASE_URL, api} from '../api';
import {Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';

import {useAppContext} from '../../context/AppContext';

export function MessageInput() {
  const styles = useThemedStyles(createStyles);
  const [text, setText] = useState("");
  const {get} = useAppContext();
  const [activeChannel, setActiveChannel] = useState(get("messages.activeChannel") ?? "");

  useEffect(() => {
    setActiveChannel(get("messages.activeChannel") ?? "");
  }, [get]);

  function sendMessage() {
    if (!text || !activeChannel) return;
    api.post(`/channels/${activeChannel}/messages`, {text}).then(() => {
      setText("");
    });
  }

  return (
    <View style={styles.content}>
      <TextInput style={styles.input} placeholder="Type a message..." value={text} onChangeText={setText} />

      <Pressable onPress={sendMessage} style={styles.sendButton}>
        <Text>Send</Text>
      </Pressable>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 8,
    padding: 8,
    maxHeight: 160,
  },
});
