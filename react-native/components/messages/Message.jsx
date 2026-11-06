import {Image, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import FileUpload from './FileUpload';
import {api} from '../api';
import {format} from '../money/format';
import {QUICK_REACTIONS, groupReactions} from './reactions';
import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from '../useCompactLayout';

const CAN_HOVER = Platform.OS === 'web' || Platform.OS === 'macos';

export function Message({message, showSender = false}) {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const {get, set} = useAppContext();
  const [reactions, setReactions] = useState(message.reactions || []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setReactions(message.reactions || []), [message.reactions]);

  const grouped = groupReactions(reactions);

  // WhatsApp replies quote the message; Slack has no quotes, so a reply there goes into the thread.
  const canQuote = message.platform === 'whatsapp';
  const canReply = canQuote || !message.thread_id;

  function reply() {
    setPickerOpen(false);
    if (!canQuote) return set("messages.activeThread", message.id);

    set("messages.replyTo", {
      id: message.id,
      channel: message.channel_id,
      sender: message.from_me ? 'You' : (message.contact?.display_name || 'Unknown'),
      body: quotePreview(message),
    });
  }

  // Choosing an emoji I already put on the message takes it back.
  function toggleReaction(emoji) {
    if (busy) return;
    const mine = grouped.some(group => group.emoji === emoji && group.mine);
    const url = `/channels/${encodeURIComponent(message.channel_id || get("messages.activeChannel"))}/messages/${encodeURIComponent(message.id)}/reactions`;

    setBusy(true);
    setPickerOpen(false);
    (mine ? api.delete(url, {emoji}) : api.post(url, {emoji}))
      .then(setReactions)
      .catch(error => console.warn(`reacting to ${message.id} failed`, error))
      .finally(() => setBusy(false));
  }

  return (
    <Pressable
      onLongPress={() => setPickerOpen(open => !open)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.chatContainer, message.from_me && styles.from_me, compact && styles.chatContainerSmall,]}>

      {showSender && !message.from_me && (
        <View style={styles.senderContainer}>
          <Image source={{uri: message.contact.avatar_url}} style={styles.avatar} />
          <Text style={styles.sender}>{message.contact.display_name}</Text>
        </View>
      )}

      {message.quoted_message && (
        <View style={styles.quote}>
          <Text style={styles.quoteSender} numberOfLines={1}>
            {message.quoted_message.from_me ? 'You' : (message.quoted_message.contact?.display_name || 'Unknown')}
          </Text>
          <Text style={styles.quoteBody} numberOfLines={2}>{quotePreview(message.quoted_message)}</Text>
        </View>
      )}

      {message.file_uploads?.length > 0 && (
        <View style={styles.files}>
          {message.file_uploads.map(file => <FileUpload key={file.id} file={file} />)}
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.content}>{message.body}</Text>
      </View>

      {message.reply_count > 0 && (
        <Pressable onPress={() => set("messages.activeThread", message.id)}>
          <Text style={styles.replyCount}>{message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}</Text>
        </Pressable>
      )}

      <View style={styles.meta}>
        <Text style={styles.meta_item}>{format.time(message.created_at)}</Text>

        <View style={styles.reactions}>
          {grouped.map(group => (
            <Pressable key={group.emoji} onPress={() => toggleReaction(group.emoji)} style={[styles.reaction, group.mine && styles.reactionMine]}>
              <Text style={styles.reactionText}>{group.emoji}{group.count > 1 ? ` ${group.count}` : ''}</Text>
            </Pressable>
          ))}

          {CAN_HOVER && canReply && (
            <Pressable onPress={reply} style={[styles.reaction, styles.addReaction, !(hovered || pickerOpen) && styles.hidden]}>
              <Text style={styles.reactionText}>↩︎</Text>
            </Pressable>
          )}

          {CAN_HOVER && (
            <Pressable onPress={() => setPickerOpen(open => !open)} style={[styles.reaction, styles.addReaction, !(hovered || pickerOpen) && styles.hidden]}>
              <Text style={styles.reactionText}>☺︎+</Text>
            </Pressable>
          )}
        </View>
      </View>

      {pickerOpen && (
        <View style={styles.picker}>
          {QUICK_REACTIONS.map(emoji => {
            const mine = grouped.some(group => group.emoji === emoji && group.mine);
            return (
              <Pressable key={emoji} onPress={() => toggleReaction(emoji)} style={[styles.pickerItem, mine && styles.reactionMine]}>
                <Text style={styles.pickerEmoji}>{emoji}</Text>
              </Pressable>
            );
          })}

          {canReply && (
            <Pressable onPress={reply} style={[styles.pickerItem, styles.pickerReply]}>
              <Text style={styles.pickerReplyText}>↩︎ Reply</Text>
            </Pressable>
          )}
        </View>
      )}

    </Pressable>
  );
}

// What a quote shows: the text, or what kind of file it was.
export function quotePreview(message) {
  if (message?.body) return message.body;
  const type = message?.file_uploads?.[0]?.mimetype || '';
  if (type.startsWith('image/')) return 'Photo';
  if (type.startsWith('video/')) return 'Video';
  if (type.startsWith('audio/')) return 'Audio';
  return type ? 'File' : 'Message';
}

const createStyles = colors => StyleSheet.create({
  content: {
    gap: 16,
    flex: 2,
  },
  chatName: {
    fontSize: 16,
  },
  sender: {
    fontWeight: 'bold',
    color: colors.primary
  },
  chatContainer: {
    marginTop: 16,
    ...glass(colors),
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    maxWidth: '75%',
    position: 'relative',
    gap: 8,
  },
  chatContainerSmall: {
    maxWidth: '85%',
  },
  body: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 8,
  },
  replyCount: {
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: 4,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 25,
  },
  from_me: {
    backgroundColor: colors.primaryContainer,
    alignSelf: 'flex-end',
  },
  content: {
    color: colors.onSurface,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  meta_item: {
    flexDirection: 'row',
    gap: 4,
    ...glass(colors),
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    color: colors.onSurfaceVariant
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  reaction: {
    ...glass(colors),
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reactionMine: {
    borderColor: colors.primary,
  },
  reactionText: {
    color: colors.onSurfaceVariant,
  },
  addReaction: {
    opacity: 0.8,
  },
  hidden: {
    opacity: 0,
  },
  picker: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 4,
    padding: 4,
    borderRadius: 16,
    ...glass(colors),
  },
  pickerItem: {
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickerReply: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pickerReplyText: {
    color: colors.primary,
    fontWeight: '600',
  },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    ...glass(colors),
  },
  quoteSender: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  quoteBody: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  pickerEmoji: {
    fontSize: 22,
  },
  senderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  }
});
