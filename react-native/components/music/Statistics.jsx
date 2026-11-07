import {StyleSheet, View} from 'react-native';

import {Song} from './Song';
import {Stat} from '../home/Stat';
import {useApi} from '../useApi';
import {player} from './player';
import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from '../useCompactLayout';
import {useThemedStyles} from '../theme';
import {format} from '../money/format';

export function Statistics() {
  const styles = useThemedStyles(createStyles);
  const isCompact = useCompactLayout();

  const {get, set} = useAppContext();

  const statistics = useApi('/music/stats').data || [];

  return (
    <View style={styles.content}>
      <View style={[styles.details, isCompact && styles.detailsCompact]}>
        <Stat label="Total plays" value={format.number(statistics?.total_plays ?? 0)} />
        <Stat label="Unique songs played" value={format.number(statistics?.different_plays ?? 0)} />
        <Stat label="Time played" value={statistics?.time_played ?? 0} />
      </View>

      {statistics?.top_songs?.map((song, index) => (
        <Song key={song.id} song={song} isEven={index % 2 === 0} onClick={() => player.play(song, set, get)} rightLabel={`${song.times_played} plays`} />
      ))}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.onSurface
  },
  subheading: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
    marginVertical: 8
  },
  playAllButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 100,
    alignItems: 'center',
    marginVertical: 16,
  },
  playAllButtonText: {
    color: colors.onPrimary,
    fontWeight: 'bold',
  },
  details: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 16,
  },
  detailsCompact: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 8,
  },
});
