import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';

import {ActiveChat} from './ActiveChat';
import {Message} from './Message';
import {useAppContext} from '../../context/AppContext';
import {useChannel} from '../cable';

export function MessageInput() {
  const styles = useThemedStyles(createStyles);
  const [text, setText] = useState("");
  const {get} = useAppContext();
  const [activeChannel, setActiveChannel] = useState(get("messages.activeChannel") ?? "");

  useEffect(() => {
    setActiveChannel(get("messages.activeChannel") ?? "");
  }, [get]);

  return (
    <View style={styles.content}>
      <TextInput style={styles.input} placeholder="Type a message..." value={text} onChangeText={setText} />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 8,
    padding: 8,
  },
});
