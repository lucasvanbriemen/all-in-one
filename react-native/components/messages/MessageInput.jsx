import {api} from '../api';
import {Image, Platform, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';

import {Icon} from '../icons';
import {GifPicker} from './GifPicker';
import {contactSuggestions, emojiSuggestions, encodeMentions, isCustomEmoji, loadContacts, loadEmoji, replaceShortcodes, tokenAt} from './autocomplete';
import {mediaPicker} from '../mediaPicker';
import {useAppContext} from '../../context/AppContext';
import {FESTIVE_PATTERN, isDecorated} from '../seasonal/season';
import {playEffect, startBlizzard} from '../seasonal/store';

// platform is "slack", "whatsapp", or null while the channel is still loading.
export function MessageInput({threadId = null, platform = null}) {
  const styles = createStyles();
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const {get, set} = useAppContext();
  const activeChannel = get("messages.activeChannel") ?? "";
  const inputRef = useRef(null);
  const sending = useRef(false);
  const [attachmentError, setAttachmentError] = useState(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [selection, setSelection] = useState(null);
  const [emoji, setEmoji] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [highlighted, setHighlighted] = useState(0);
  // Only set right after we move the cursor ourselves; otherwise the input owns it.
  const [forcedSelection, setForcedSelection] = useState(null);
  const [dismissedAt, setDismissedAt] = useState(null);
  // Display name -> Slack user id for every @mention picked from the list.
  const mentions = useRef({});

  useEffect(() => {
    loadEmoji().then(setEmoji).catch(() => {});
    if (platform === 'slack') loadContacts().then(setContacts).catch(() => {});
  }, [platform]);

  const cursor = selection?.end ?? text.length;
  const token = tokenAt(text, cursor);
  const suggestions = !token || dismissedAt === token.start ? []
    : token.trigger === ':' ? (emoji ? emojiSuggestions(emoji, token.query, platform) : [])
    : platform === 'slack' && contacts ? contactSuggestions(contacts, token.query) : [];
  const active = Math.min(highlighted, Math.max(suggestions.length - 1, 0));

  useEffect(() => setHighlighted(0), [token?.trigger, token?.query]);

  function pickSuggestion(suggestion) {
    let insert;
    if (suggestion.type === 'contact') {
      insert = `@${suggestion.name} `;
      mentions.current[suggestion.name] = suggestion.id;
    } else {
      insert = isCustomEmoji(suggestion.value) ? `:${suggestion.name}: ` : suggestion.value;
    }
    const next = text.slice(0, token.start) + insert + text.slice(token.end);
    const position = token.start + insert.length;
    setText(next);
    setSelection({start: position, end: position});
    setForcedSelection({start: position, end: position});
    inputRef.current?.focus();
  }

  // Arrow keys move through the list, Tab/Enter pick, Escape closes it. True when handled.
  function handleSuggestionKey(key) {
    if (!suggestions.length) return false;
    if (key === 'ArrowDown') setHighlighted((active + 1) % suggestions.length);
    else if (key === 'ArrowUp') setHighlighted((active - 1 + suggestions.length) % suggestions.length);
    else if (key === 'Enter' || key === 'Tab') pickSuggestion(suggestions[active]);
    else if (key === 'Escape') setDismissedAt(token.start);
    else return false;
    return true;
  }

  // Finishing a :shortcode: by hand turns it into the emoji, like Slack does.
  function changeText(value) {
    const replaced = value.length > text.length ? replaceShortcodes(value, emoji) : value;
    if (replaced !== value) {
      const position = (selection?.end ?? text.length) + replaced.length - text.length;
      setSelection({start: position, end: position});
      setForcedSelection({start: position, end: position});
    }
    setText(replaced);
  }

  function outgoingText() {
    const plain = replaceShortcodes(text, emoji);
    return platform === 'slack' ? encodeMentions(plain, mentions.current) : plain;
  }

  function sendGif(gif) {
    setGifOpen(false);
    api.post(`/channels/${activeChannel}/gifs`, {url: gif.url, mp4: gif.mp4, title: gif.title, thread_id: threadId, quote_id: quote?.id})
      .then(() => { if (quote) set("messages.replyTo", null); });
  }

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

  // The web textarea grows with its text (up to maxHeight) and shrinks back after sending.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const input = inputRef.current;
    if (!input?.style) return;
    input.style.height = 'auto';
    const border = input.offsetHeight - input.clientHeight;
    input.style.height = `${Math.min(input.scrollHeight + border, 160)}px`;
  }, [text]);

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

  // Enter with the suggestion list open picks the highlighted entry instead of sending.
  function submit() {
    if (!handleSuggestionKey('Enter')) sendMessage();
  }

  function sendMessage() {
    // Enter on an empty box shouldn't post an empty message.
    // Holding or double-tapping Enter shouldn't send the same message twice.
    if ((!text.trim() && !attachment) || sending.current) return;
    sending.current = true;

    const outgoing = outgoingText();
    const request = attachment
      ? api.upload(`/channels/${activeChannel}/files`, {file: attachment.file || {uri: attachment.uri, name: attachment.name, type: attachment.type}, text: outgoing || null, thread_id: threadId, quote_id: quote?.id})
      : api.post(`/channels/${activeChannel}/messages`, {text: outgoing, thread_id: threadId, quote_id: quote?.id});

    // Wishing someone a merry Christmas gets the iMessage treatment.
    if (isDecorated() && FESTIVE_PATTERN.test(text)) {
      playEffect({type: 'burst', source: 'message', count: 120, power: 14, width: 400});
    }

    request.then(() => {
      setText("");
      setSelection(null);
      setDismissedAt(null);
      mentions.current = {};
      setAttachment(null);
      if (quote) set("messages.replyTo", null);
    }).finally(() => { sending.current = false; })
  }

  const canSend = !!text.trim() || !!attachment;

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

      {gifOpen && <GifPicker onPick={sendGif} onClose={() => setGifOpen(false)} />}

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((suggestion, index) => (
            <Pressable key={suggestion.key} onPress={() => pickSuggestion(suggestion)} onHoverIn={() => setHighlighted(index)}
              style={[styles.suggestion, index === active && styles.suggestionActive]}>
              {suggestion.type === 'contact'
                ? <Image source={{uri: suggestion.avatar_url}} style={styles.suggestionAvatar} />
                : isCustomEmoji(suggestion.value)
                  ? <Image source={{uri: suggestion.value}} style={styles.suggestionEmoji} />
                  : <Text style={styles.suggestionGlyph}>{suggestion.value}</Text>}
              <Text style={styles.suggestionName} numberOfLines={1}>
                {suggestion.type === 'contact' ? suggestion.name : `:${suggestion.name}:`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.content}>
        <Pressable onPress={pickAttachment} accessibilityLabel="Attach a file"
          style={({pressed, hovered}) => [styles.iconButton, (pressed || hovered) && styles.iconButtonActive]}>
          <Icon name="paperclip" size={20} color={styles.iconColor.color} />
        </Pressable>

        <Pressable onPress={() => setGifOpen(open => !open)} accessibilityLabel="Send a GIF"
          style={({pressed, hovered}) => [styles.iconButton, (pressed || hovered || gifOpen) && styles.iconButtonActive]}>
          <Text style={[styles.gifLabel, styles.iconColor]}>GIF</Text>
        </Pressable>

        <TextInput ref={inputRef} style={styles.input}
          {...(Platform.OS === 'macos' ? {
            multiline: true,
            // Enter sends, Shift+Enter still adds a newline (it doesn't match this key event).
            submitKeyEvents: [{key: 'Enter'}],
            // Only claim these keys while the suggestion list is open.
            keyDownEvents: suggestions.length ? [{key: 'ArrowUp'}, {key: 'ArrowDown'}, {key: 'Tab'}, {key: 'Escape'}] : [],
            onKeyDown: event => handleSuggestionKey(event.nativeEvent.key),
            pastedTypes: ['image', 'fileUrl', 'string'],
            onPaste: event => {
              const file = event.nativeEvent.dataTransfer?.files?.find(item => item.type?.startsWith('image/'));
              if (file) pasteImage(file);
            },
          } : {})}
          {...(Platform.OS === 'web' ? {
            multiline: true,
            rows: 1,
            // Enter sends, Shift+Enter adds a newline, like Slack. Skipped mid-IME so
            // confirming a Japanese/Chinese composition doesn't send half a word.
            onKeyPress: event => {
              const {key, shiftKey, isComposing} = event.nativeEvent;
              if (isComposing) return;
              if (key !== 'Enter' && handleSuggestionKey(key)) return event.preventDefault();
              if (key !== 'Enter' || shiftKey) return;
              event.preventDefault();
              submit();
            },
          } : {})}
          // Enter sends and the input keeps focus, like WhatsApp/Slack.
          onSubmitEditing={submit}
          submitBehavior="submit"
          returnKeyType="send"
          selection={forcedSelection ?? undefined}
          onSelectionChange={event => {
            setSelection(event.nativeEvent.selection);
            setForcedSelection(null);
          }}
          placeholder={attachment ? "Add a comment..." : "Type a message..."} value={text} onChangeText={value => {
          changeText(value);
          // Type "hohoho" for a blizzard (the web build also listens document-wide).
          if (isDecorated() && /hohoho$/i.test(value)) startBlizzard(10);
        }} />

        <Pressable onPress={sendMessage} disabled={!canSend} accessibilityLabel="Send"
          style={({pressed}) => [styles.sendButton, !canSend && styles.sendButtonIdle, pressed && styles.sendButtonPressed]}>
          <Icon name="send" size={18} color={canSend ? styles.sendIcon.color : styles.iconColor.color} />
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
    // Buttons stay on the last line while the input grows upward.
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    ...surfaceStyle(colors),
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 160,
    fontSize: 15,
    color: colors.onSurface,
    ...(Platform.OS === 'web' ? {outlineStyle: 'none'} : {}),
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    ...surfaceStyle(colors),
  },
  iconColor: {
    color: colors.onSurfaceVariant,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer,
  },
  sendButtonIdle: {
    ...surfaceStyle(colors),
  },
  sendButtonPressed: {
    opacity: 0.7,
  },
  sendIcon: {
    color: colors.onPrimaryContainer,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: 12,
    ...surfaceStyle(colors),
  },
  quote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    ...surfaceStyle(colors),
  },
  quoteText: {
    flex: 1,
  },
  quoteSender: {
    color: colors.primary,
    fontWeight: '600',
  },
  gifLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  suggestions: {
    ...surfaceStyle(colors),
    borderRadius: 12,
    paddingVertical: 4,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionActive: {
    backgroundColor: colors.surfaceVariant,
  },
  suggestionAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  suggestionEmoji: {
    width: 22,
    height: 22,
  },
  suggestionGlyph: {
    width: 22,
    fontSize: 18,
    textAlign: 'center',
  },
  suggestionName: {
    flex: 1,
    color: colors.onSurface,
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
