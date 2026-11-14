import {api} from '../api';
import {Image, Platform, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import {mediaPicker} from '../mediaPicker';
import {useAppContext} from '../../context/AppContext';
import {FESTIVE_PATTERN, isDecorated} from '../seasonal/season';
import {playEffect, startBlizzard} from '../seasonal/store';

export function MessageInput({threadId = null}) {
  const styles = useThemedStyles(createStyles);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const {get, set} = useAppContext();
  const activeChannel = get("messages.activeChannel") ?? "";
  const inputRef = useRef(null);
  const [attachmentError, setAttachmentError] = useState(null);

  async function pasteImage(file) {
    try {
      const prepared = await mediaPicker.preparePastedImage(file);
      setAttachment(prepared);
      setAttachmentError(null);
    } catch {
      setAttachmentError('Could not paste this image. Try attaching it with +.');
    }
  }

  // Scope the browser listener to this input, including when a thread is open.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const input = inputRef.current;
    function onPaste(event) {
      const file = Array.from(event.clipboardData?.files || []).find(item => item.type.startsWith('image/'));
      if (!file) return;
      event.preventDefault();
      pasteImage(file);
    }
    input?.addEventListener('paste', onPaste);
    return () => input?.removeEventListener('paste', onPaste);
  }, []);

  // A reply picked in another chat (or the thread pane) doesn't belong to this input.
  const replyTo = get("messages.replyTo");
  const quote = !threadId && replyTo?.channel === activeChannel ? replyTo : null;

  useEffect(() => {
    if (quote) inputRef.current?.focus();
  }, [quote?.id]);

  async function pickAttachment() {
    const picked = await mediaPicker.pick();
    if (picked) {
      setAttachment(picked);
      setAttachmentError(null);
    }
  }

  function sendMessage() {
    const request = attachment
      ? api.upload(`/channels/${activeChannel}/files`, {file: attachment.file || {uri: attachment.uri, name: attachment.name, type: attachment.type}, text: text || null, thread_id: threadId, quote_id: quote?.id})
      : api.post(`/channels/${activeChannel}/messages`, {text, thread_id: threadId, quote_id: quote?.id});

    // Wishing someone a merry Christmas gets the iMessage treatment.
    if (isDecorated() && FESTIVE_PATTERN.test(text)) {
      playEffect({type: 'burst', source: 'message', count: 120, power: 14, width: 400});
    }

    request.then(() => {
      setText("");
      setAttachment(null);
      if (quote) set("messages.replyTo", null);
    })
  }

  return (
    <View style={styles.container}>
      {quote && (
        <View style={styles.quote}>
          <View style={styles.quoteText}>
            <Text style={styles.quoteSender} numberOfLines={1}>Replying to {quote.sender}</Text>
            <Text style={styles.attachmentName} numberOfLines={1}>{quote.body}</Text>
          </View>
          <Pressable onPress={() => set("messages.replyTo", null)}>
            <Icon name="cross" size={16} color={styles.attachmentName.color} />
          </Pressable>
        </View>
      )}

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

      {attachmentError && <Text accessibilityRole="alert">{attachmentError}</Text>}

      <View style={styles.content}>
        <Pressable onPress={pickAttachment}>
          <Icon name="plus" size={24} color={styles.attachmentName.color} />
        </Pressable>

        <TextInput ref={inputRef} style={styles.input}
          {...(Platform.OS === 'macos' ? {
            multiline: true,
            pastedTypes: ['image', 'fileUrl', 'string'],
            onPaste: event => {
              const file = event.nativeEvent.dataTransfer?.files?.find(item => item.type?.startsWith('image/'));
              if (file) pasteImage(file);
            },
          } : {})}
          placeholder={attachment ? "Add a comment..." : "Type a message..."} value={text} onChangeText={value => {
          setText(value);
          // Type "hohoho" for a blizzard (the web build also listens document-wide).
          if (isDecorated() && /hohoho$/i.test(value)) startBlizzard(10);
        }} />

        <Pressable onPress={sendMessage} style={styles.sendButton}>
          <Text>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: {
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
  quote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    ...glass(colors),
  },
  quoteText: {
    flex: 1,
  },
  quoteSender: {
    color: colors.primary,
    fontWeight: '600',
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
