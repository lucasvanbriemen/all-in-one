import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {Notification} from './Notification';
import {NowPlayingCard} from '../music/NowPlayingCard';
import {Stat} from './Stat';
import {api} from '../api';
import {greeting} from './greeting';
import {useCompactLayout} from '../useCompactLayout';
import {useScrollLayout} from '../ScrollLayout';
import {useThemedStyles} from '../theme';

export function HomePage({ activeSidebarItem }) {
  const scrollLayout = useScrollLayout();
  const compact = useCompactLayout();
  const Container = compact ? ScrollView : View;
  const NotificationContainer = compact ? View : ScrollView;
  const styles = useThemedStyles(createStyles);
  const [serverData, setServerData] = useState(null);
  const [notifications, setNotifications] = useState(null);

  useEffect(() => {
    api.get('/server_data').then(response => {
      setServerData(response);
    });

    api.get('/notifications').then(response => {
      setNotifications(response);
    });
  }, []);

  return (
    <Container
      style={styles.content}
      {...(compact ? scrollLayout : {})}
      contentContainerStyle={compact ? [styles.scrollContent, scrollLayout.contentContainerStyle] : undefined}
    >
      <View style={[styles.statsContainer, compact && styles.compactStats]}>
        {serverData &&
          serverData.map((data, index) => (
            <Stat
              key={index}
              value={data.value}
              label={data.label}
              attentionLevel={data.importance_level}
            />
          ))}
      </View>

      <Text style={styles.greeting}>{greeting.generateGreeting()}</Text>

      <View style={[styles.mainContent, compact && styles.compactMain]}>
        <View style={compact ? undefined : styles.notificationsContainer}>
          <NotificationContainer>
            {notifications &&
              notifications.map((notification, index) => (
                <Notification key={index} notification={notification} />
              ))}
          </NotificationContainer>
        </View>

        <View style={compact ? undefined : styles.nowPlaying}>
          <NowPlayingCard />
        </View>
      </View>
    </Container>
  );
}

const createStyles = colors => StyleSheet.create({
  scrollContent: { paddingBottom: 16 },
  compactStats: { flexWrap: 'wrap', gap: 8 },
  compactMain: { flex: 0, flexDirection: 'column', gap: 16 },
  notificationsContainer: {
    flex: 2,
  },
  nowPlaying: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
    color: colors.outline,
  },
  mainContent: {
    flex: 1,
    marginTop: 16,
    flexDirection: 'row',
    gap: 32,
  },
});
