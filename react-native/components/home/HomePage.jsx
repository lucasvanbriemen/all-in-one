import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {Notification} from './Notification';
import {NowPlayingCard} from '../music/NowPlayingCard';
import {OverviewCard} from '../money/OverviewCard';
import {Reminder} from './Reminder';
import {ReminderForm} from './ReminderForm';
import {Stat} from './Stat';
import {UncategorizedTransactions} from '../money/UncategorizedTransactions';
import {AdventCalendar} from '../seasonal/AdventCalendar';
import {ChristmasTreeCard} from '../seasonal/ChristmasTree';
import {CountdownStat} from '../seasonal/Countdowns';
import {NaughtyNiceCard} from '../seasonal/NaughtyNice';
import {SnowCap} from '../seasonal/SnowCap';
import {useSeason} from '../seasonal/useSeason';
import {Greeting} from './Greeting';
import { useApi } from "../useApi";
import {useCompactLayout} from '../useCompactLayout';

export function HomePage() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const serverData = useApi('/server_data').data;
  const notifications = useApi('/notifications').data;
  const reminders = useApi('/reminders').data;
  const season = useSeason();

  return (
    <View style={styles.content}>
      <Greeting />

      <View style={[styles.statsContainer, compact && styles.compactStats]}>
        {serverData && serverData.map((data, index) => (
          <Stat key={index} value={data.value} label={grinchLabel(season, data)} attentionLevel={data.importance_level}/>
        ))}
        <CountdownStat />
      </View>

      {season.decorated && (season.phase === 'advent' || season.phase === 'christmas') && (
        <View style={[styles.seasonalRow, compact && styles.seasonalRowCompact]}>
          <AdventCalendar />
          {!compact && <ChristmasTreeCard />}
          {!compact && <NaughtyNiceCard />}
        </View>
      )}

      <View style={[styles.mainContent, compact && styles.compactMain]}>
        <View style={compact ? undefined : styles.notificationsContainer}>
          <ScrollView>
            {notifications && notifications.map((notification, index) => (
              <Notification key={index} notification={notification} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.itemRow}>
          <NowPlayingCard />
        </View>

        <View style={styles.reminders}>
          <SnowCap />
          <Text style={styles.cardTitle}>Reminders</Text>
          <ScrollView style={styles.reminderList}>
            {reminders && reminders.length === 0 && (
              <Text style={styles.empty}>Nothing to remind you of right now.</Text>
            )}
            {reminders && reminders.map(reminder => (
              <Reminder key={reminder.id} reminder={reminder} onComplete={done => {}}/>
            ))}
          </ScrollView>
          <ReminderForm onCreate={created => {}} />
        </View>
        <View style={styles.moneyColumn}>
          <OverviewCard />
          <UncategorizedTransactions />
        </View>
      </View>
    </View>
  );
}

/** A server stat in trouble, during the season, is the Grinch's doing. */
function grinchLabel(season, data) {
  if (!season.decorated || data.importance_level !== 'high') return data.label;
  return `🟢 The Grinch stole your ${String(data.label).toLowerCase()}`;
}

const createStyles = colors => StyleSheet.create({
  seasonalRow: {
    flexDirection: 'row',
    gap: 16,
  },
  seasonalRowCompact: {flexDirection: 'column'},
  compactStats: { flexWrap: 'wrap', gap: 8 },
  compactMain: { flex: 0, flexDirection: 'column', gap: 16 },
  notificationsContainer: {
    flex: 2,
  },
  itemRow: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
    color: colors.onSurface
  },
  reminders: {
    flex: 1,
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
  },
  reminderList: {flex: 1},
  moneyColumn: {
    flex: 1,
    gap: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.onSurface,
  },
  empty: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
});
