import {ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {CategoryGroup, createStyles as createMoneyStyles} from '../money/UncategorizedTransactions';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {Icon} from '../icons';
import {api} from '../api';
import {openSource} from '../push';
import {useAppContext} from '../../context/AppContext';

// Splits a source the same way openSource does: only the first two dots
// separate parts, since WhatsApp JIDs contain dots themselves.
function parseSource(source) {
  const [kind, section, ...rest] = String(source || '').split('.');
  return {kind, section, id: rest.join('.')};
}

// Kinds that get follow-up actions when tapped; anything else opens directly.
const EXPANDABLE = ['transactions', 'messages', 'email'];

export function Notification({notification}) {
  const styles = useThemedStyles(createStyles);
  const {set} = useAppContext();

  const [isRead, setIsRead] = useState(notification.read);
  const [expanded, setExpanded] = useState(false);
  const source = parseSource(notification.source);
  const expandable = EXPANDABLE.includes(source.kind);

  async function markAsRead() {
    await api.post(`/notifications/${notification.id}/mark_as_read`);
    setIsRead(true);
  }

  function openNotification() {
    markAsRead();
    openSource(set, notification.source);
  }

  if (isRead) return null;

  return (
    <View style={[styles.notification, expanded && styles.notificationExpanded]}>
      <View style={styles.row}>
        <Pressable style={styles.text} onPress={expandable ? () => setExpanded(!expanded) : openNotification}>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.body} numberOfLines={expanded ? undefined : 2}>{notification.body}</Text>
        </Pressable>

        <Pressable onPress={markAsRead} hitSlop={8}>
          <Icon name="cross" size={24} color={styles.accent.color} />
        </Pressable>
      </View>

      {expanded && (
        <View style={styles.actions}>
          {source.kind === 'transactions' && (
            <TransactionActions transactionId={Number(source.id)} onDone={markAsRead} styles={styles} />
          )}
          {source.kind === 'messages' && (
            <MessageActions channelId={source.id} onDone={() => setIsRead(true)} styles={styles} />
          )}
          {source.kind === 'email' && (
            <EmailActions emailId={Number(source.id)} onDone={() => setIsRead(true)} styles={styles} />
          )}

          <Pressable style={styles.button} onPress={openNotification}>
            <Text style={styles.buttonText}>Open</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// The same category chips as the Uncategorized card. Categorizing dismisses the notification.
function TransactionActions({transactionId, onDone, styles}) {
  const moneyStyles = useThemedStyles(createMoneyStyles);
  const [state, setState] = useState(null);

  useEffect(() => {
    api.get('/money/transactions/uncategorized').then(response => {
      setState({
        transaction: response.transactions.find(t => t.id === transactionId),
        budget: response.budget_categories,
        other: response.other_categories,
      });
    });
  }, [transactionId]);

  async function categorize(category) {
    await api.post(`/money/transactions/${transactionId}`, {category});
    onDone();
  }

  if (!state) return <ActivityIndicator color={styles.accent.color} />;
  if (!state.transaction) return <Text style={styles.hint}>Already categorized.</Text>;

  const suggestion = state.transaction.suggested_category;

  return (
    <View style={styles.categories}>
      <CategoryGroup title="Budgets" categories={state.budget} suggestion={suggestion} onPick={categorize} styles={moneyStyles} />
      <CategoryGroup title="Other" categories={state.other} suggestion={suggestion} onPick={categorize} styles={moneyStyles} />
    </View>
  );
}

// Mark the chat as read (read receipt + clears its notifications), or reply inline.
// Replying counts as reading, so it marks the chat read too.
function MessageActions({channelId, onDone, styles}) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const channel = encodeURIComponent(channelId);

  async function markChatAsRead() {
    await api.post(`/channels/${channel}/mark_as_read`);
    onDone();
  }

  async function sendReply() {
    if (!reply.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      // api.post doesn't throw on HTTP errors; a failed send answers {error}.
      const response = await api.post(`/channels/${channel}/messages`, {text: reply});
      if (!response?.success) {
        setError(response?.error || 'Sending failed');
        return;
      }
      await markChatAsRead();
    } catch {
      setError('Sending failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <View style={styles.replyRow}>
        <TextInput
          style={styles.input}
          placeholder="Reply..."
          placeholderTextColor={styles.hint.color}
          value={reply}
          onChangeText={setReply}
          onSubmitEditing={sendReply}
          returnKeyType="send"
        />
        <Pressable style={[styles.button, styles.primaryButton]} onPress={sendReply} disabled={sending}>
          <Text style={styles.primaryButtonText}>{sending ? 'Sending…' : 'Send'}</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={markChatAsRead}>
        <Text style={styles.buttonText}>Mark as read</Text>
      </Pressable>
    </>
  );
}

function EmailActions({emailId, onDone, styles}) {
  async function markEmailAsRead() {
    await api.post(`/emails/${emailId}/mark_as_read`);
    onDone();
  }

  return (
    <Pressable style={styles.button} onPress={markEmailAsRead}>
      <Text style={styles.buttonText}>Mark as read</Text>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  notification: {
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  notificationExpanded: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderTopColor: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.onSurface,
  },
  body: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  accent: {
    color: colors.primary,
  },
  actions: {
    marginTop: 12,
    gap: 8,
  },
  categories: {
    gap: 12,
  },
  hint: {
    fontSize: 13,
    color: colors.outline,
  },
  error: {
    fontSize: 13,
    color: colors.error,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 8,
    padding: 8,
    color: colors.onSurface,
  },
  button: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
  },
  buttonText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.onPrimary,
  },
});
