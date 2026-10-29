import {BASE_URL, api} from '../api';
import {Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';

import {Icon} from '../icons';
import {mediaPicker} from '../mediaPicker';
import {useAppContext} from '../../context/AppContext';

export function MessageInput({threadId = null}) {
  const styles = useThemedStyles(createStyles);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const {get} = useAppContext();
  const [activeChannel, setActiveChannel] = useState(get("messages.activeChannel") ?? "");

  useEffect(() => {
    setActiveChannel(get("messages.activeChannel") ?? "");
  }, [get]);

  async function pickAttachment() {
    const picked = await mediaPicker.pick();
    if (picked) setAttachment(picked);
  }

  function sendMessage() {
    const request = attachment
      ? api.upload(`/channels/${activeChannel}/files`, {file: {uri: attachment.uri, name: attachment.name, type: attachment.type}, text: text || null, thread_id: threadId})
      : api.post(`/channels/${activeChannel}/messages`, {text, thread_id: threadId});

    request.then(() => {
      setText("");
      setAttachment(null);
    })
  }

  return (
    <View style={styles.container}>
      {attachment && (
        <View style={styles.attachment}>
          {attachment.kind === 'image'
            ? <Image source={{uri: attachment.uri}} style={styles.attachmentPreview} />
            : <Text>🎬</Text>}
          <Text style={styles.attachmentName} numberOfLines={1}>{attachment.name}</Text>
          <Pressable onPress={() => setAttachment(null)}>
            <Icon name="cross" size={16} color={styles.attachmentName.color} />
          </Pressable>
        </View>
      )}

      <View style={styles.content}>
        <Pressable onPress={pickAttachment}>
          <Icon name="plus" size={24} color={styles.attachmentName.color} />
        </Pressable>

        <TextInput style={styles.input} placeholder={attachment ? "Add a comment..." : "Type a message..."} value={text} onChangeText={setText} />

        <Pressable onPress={sendMessage} style={styles.sendButton}>
          <Text>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: {
    padding: 8,
    gap: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
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
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: 12,
    ...glass(colors),
  },
  attachmentPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  attachmentName: {
    flex: 1,
    color: colors.secondary,
  },
});
