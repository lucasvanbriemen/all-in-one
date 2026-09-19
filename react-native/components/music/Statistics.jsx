import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';

import {Song} from './Song';
import {Stat} from '../home/Stat';
import {api} from '../api';
import {player} from './player';
import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from '../useCompactLayout';
import {useThemedStyles} from '../theme';

export function Statistics() {
  const styles = useThemedStyles(createStyles);
  const isCompact = useCompactLayout();

  const {set} = useAppContext();

  const [statistics, setStatistics] = useState([]);

  useEffect(() => {
    api.get('/music/stats').then(response => {
      setStatistics(response);
    });
  }, []);

  return (
    <View style={styles.content}>
      <View style={[styles.details, isCompact && styles.detailsCompact]}>
        <Stat label="Total plays" value={statistics?.total_plays ?? 0} />
        <Stat label="Unique songs played" value={statistics?.different_plays ?? 0} />
        <Stat label="Time played" value={statistics?.time_played ?? 0} />
      </View>

      {statistics?.top_songs?.map((song, index) => (
        <Song key={song.isrc} song={song} isEven={index % 2 === 0} onClick={() => player.playPlaylist(statistics.top_songs, set, index)} rightLabel={`${song.times_played} plays`} />
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
