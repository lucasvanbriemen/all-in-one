import {Animated, Image, PanResponder, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import FileUpload from './FileUpload';
import {RichText} from './RichText';
import {tick} from '../haptics';
import {api} from '../api';
import {format} from '../money/format';
import {QUICK_REACTIONS, groupReactions} from './reactions';
import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from '../useCompactLayout';
import {Icon} from '../icons';

const CAN_HOVER = Platform.OS === 'web' || Platform.OS === 'macos';
// Touch screens reply WhatsApp-style: drag the bubble right past the threshold and let go.
const SWIPE_ENABLED = Platform.OS === 'ios' || Platform.OS === 'android';
const SWIPE_THRESHOLD = 60;
const SWIPE_MAX = 90;

// Memoized: a chat refresh keeps the older message objects, so only new ones re-render.
export const Message = React.memo(function Message({message, showSender = false}) {
  const compact = useCompactLayout();
  const styles = createStyles();
  const {get, set} = useAppContext();
  const [reactions, setReactions] = useState(message.reactions || []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setReactions(message.reactions || []), [message.reactions]);

  const grouped = groupReactions(reactions);

  // Slack highlights messages that ping me; @here/@channel/@everyone count too.
  const mentionsMe = !message.from_me && (
    Object.values(message.mentions || {}).some(mention => mention.me)
    || /<!(here|channel|everyone)\b/.test(message.body || '')
  );

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

  const swipeX = useRef(new Animated.Value(0)).current;
  const armed = useRef(false);
  const replyRef = useRef(reply);
  replyRef.current = reply;

  const swipe = useMemo(() => PanResponder.create({
    // Only claim clearly horizontal rightward drags, so vertical scrolling keeps working.
    onMoveShouldSetPanResponder: (_, {dx, dy}) => dx > 10 && Math.abs(dx) > Math.abs(dy) * 2,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, {dx}) => {
      // Follow the finger, then add resistance past the threshold.
      const x = Math.max(0, dx);
      // Tick once when crossing the threshold, either way, so you feel when letting go will reply.
      if ((x >= SWIPE_THRESHOLD) !== armed.current) {
        armed.current = x >= SWIPE_THRESHOLD;
        if (armed.current) tick();
      }
      swipeX.setValue(x < SWIPE_THRESHOLD ? x : Math.min(SWIPE_MAX, SWIPE_THRESHOLD + (x - SWIPE_THRESHOLD) * 0.3));
    },
    onPanResponderRelease: (_, {dx}) => {
      armed.current = false;
      if (dx >= SWIPE_THRESHOLD) replyRef.current();
      Animated.spring(swipeX, {toValue: 0, useNativeDriver: true, bounciness: 6}).start();
    },
    onPanResponderTerminate: () => {
      armed.current = false;
      Animated.spring(swipeX, {toValue: 0, useNativeDriver: true}).start();
    },
  }), [swipeX]);

  const swipeable = SWIPE_ENABLED && canReply;
  const arrowOpacity = swipeX.interpolate({inputRange: [0, 20, SWIPE_THRESHOLD], outputRange: [0, 0.3, 1], extrapolate: 'clamp'});
  const arrowScale = swipeX.interpolate({inputRange: [0, SWIPE_THRESHOLD, SWIPE_THRESHOLD + 8], outputRange: [0.5, 1, 1.2], extrapolate: 'clamp'});

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
    <Animated.View
      {...(swipeable ? swipe.panHandlers : {})}
      style={[styles.row, message.from_me && styles.rowFromMe, compact && styles.chatContainerSmall, {transform: [{translateX: swipeX}]}]}>

    {swipeable && (
      <Animated.View pointerEvents="none" style={[styles.swipeArrow, {opacity: arrowOpacity, transform: [{scale: arrowScale}]}]}>
        <Text style={styles.swipeArrowText}>↩︎</Text>
      </Animated.View>
    )}

    <Pressable
      onLongPress={() => setPickerOpen(open => !open)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.chatContainer, message.from_me && styles.from_me, mentionsMe && styles.mentionsMe]}>

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
        <RichText text={message.body} platform={message.platform} mentions={message.mentions} emoji={message.emoji} style={styles.content} />
      </View>

      {message.reply_count > 0 && (
        <Pressable onPress={() => set("messages.activeThread", message.id)}>
          <Text style={styles.replyCount}>{message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}</Text>
        </Pressable>
      )}

      <View style={styles.meta}>
        <View style={styles.timeRow}>
          <Text style={styles.meta_item}>{format.time(message.created_at)}</Text>
          {message.from_me && message.platform === 'whatsapp' && <DeliveryStatus status={message.status} styles={styles} />}
        </View>

        <View style={styles.reactions}>
          {grouped.map(group => (
            <Pressable key={group.emoji} onPress={() => toggleReaction(group.emoji)} style={[styles.reaction, group.mine && styles.reactionMine]}>
              <Text style={styles.reactionText}>
                {group.url ? <Image source={{uri: group.url}} style={styles.reactionImage} /> : group.emoji}
                {group.count > 1 ? ` ${group.count}` : ''}
              </Text>
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
    </Animated.View>
  );
});

// WhatsApp's ticks for my own messages. The connector passes Baileys' status through:
// 0 error, 1 pending, 2 sent to the server, 3 delivered, 4 read, 5 played (voice notes).
const STATUS_ICONS = {0: 'alert', 1: 'clock', 2: 'check', 3: 'check-double', 4: 'check-double', 5: 'check-double'};

function DeliveryStatus({status, styles}) {
  const name = STATUS_ICONS[status];
  if (!name) return null;
  const color = status === 0 ? styles.statusError.color : status >= 4 ? styles.statusRead.color : styles.status.color;
  return <Icon name={name} size={14} color={color} />;
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
  row: {
    marginTop: 16,
    alignSelf: 'flex-start',
    maxWidth: '75%',
  },
  rowFromMe: {
    alignSelf: 'flex-end',
  },
  swipeArrow: {
    position: 'absolute',
    left: -40,
    top: 0,
    bottom: 0,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeArrowText: {
    fontSize: 20,
    color: colors.primary,
  },
  chatContainer: {
    ...surfaceStyle(colors),
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    position: 'relative',
    gap: 8,
  },
  chatContainerSmall: {
    maxWidth: '85%',
  },
  body: {
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
  },
  mentionsMe: {
    borderWidth: 1,
    borderColor: colors.warning,
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
    ...surfaceStyle(colors),
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    color: colors.onSurfaceVariant
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  status: {
    color: colors.onSurfaceVariant,
  },
  statusRead: {
    color: colors.primary,
  },
  statusError: {
    color: colors.error,
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  reaction: {
    ...surfaceStyle(colors),
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
  reactionImage: {
    width: 16,
    height: 16,
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
    ...surfaceStyle(colors),
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
    ...surfaceStyle(colors),
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
