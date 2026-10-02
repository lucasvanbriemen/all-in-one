import {Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {BASE_URL, api} from '../api';
import {glass, useThemedStyles} from '../theme';

// Connecting is a browser OAuth round-trip, so it opens outside the app and
// the server's login cookie does the rest.
export function GoogleStatus() {
  const styles = useThemedStyles(createStyles);
  const [connections, setConnections] = useState(null);
  const [syncing, setSyncing] = useState(false);

  function load() {
    api.get('/calendar/google').then(setConnections).catch(() => setConnections([]));
  }

  useEffect(load, []);

  async function syncNow() {
    setSyncing(true);
    try {
      await api.post('/calendar/google/sync');
      setTimeout(() => { load(); setSyncing(false); }, 4000);
    } catch {
      setSyncing(false);
    }
  }

  if (!connections) return null;

  if (connections.length === 0) {
    return (
      <View style={styles.bar}>
        <Text style={styles.text}>No Google Calendar connected.</Text>
        <Pressable style={styles.button} onPress={() => Linking.openURL(`${BASE_URL}/calendar/google/connect`)}>
          <Text style={styles.buttonText}>Connect Google</Text>
        </Pressable>
      </View>
    );
  }

  const connection = connections[0];
  const synced = connection.last_synced_at
    ? `Synced ${new Date(connection.last_synced_at).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'})}`
    : 'Not synced yet';

  return (
    <View style={styles.bar}>
      <Text style={styles.text} numberOfLines={1}>
        {connection.email} · {connection.last_sync_error ? 'Sync failed' : synced}
      </Text>
      <Pressable style={styles.button} onPress={syncNow} disabled={syncing}>
        <Text style={styles.buttonText}>{syncing ? 'Syncing…' : 'Sync now'}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  bar: {
    ...glass(colors, {variant: 'subtle'}),
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: {flex: 1, fontSize: 13, color: colors.onSurfaceVariant},
  button: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary},
  buttonText: {color: colors.onPrimary, fontSize: 13},
});
