import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';

import {Song} from './Song';
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
        <Text style={styles.subheading}>{statistics?.top_songs?.length ?? 0} songs, {(statistics?.top_songs?.reduce((total, song) => total + song.duration, 0) / 60).toFixed(0)} minutes</Text>
        <Text style={styles.subheading}>{statistics?.total_seconds_played ?? 0} seconds played, {statistics?.top_songs?.reduce((total, song) => total + song.times_played, 0) ?? 0} times played</Text>
      </View>

      {statistics?.top_songs?.map((song, index) => (
        <Song key={song.isrc} song={song} isEven={index % 2 === 0} onClick={() => player.playPlaylist(statistics.top_songs, set, index)} />
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
    marginVertical: 24,
    width: '50%',
    marginLeft: '25%',
  },
  detailsCompact: {
    width: '100%',
    marginLeft: '0%',
  }
});
