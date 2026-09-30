import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {Stat} from '../home/Stat';
import {api} from '../api';
import {format} from './format';
import {useCompactLayout} from '../useCompactLayout';

export function OverviewCard() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const [overview, setOverview] = useState([]);

  useEffect(() => {
    api.get('/money/overview').then(response => {
      setOverview(response);
    });
  }, []);

  return (
    <View style={styles.content}>
      <View style={styles.row}>
        <Text style={styles.title}>balance min fixed costs</Text>
        <Text style={styles.title}>{overview?.balance_min_fixed_costs}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.title}>money per day</Text>
        <Text style={styles.title}>{overview?.money_per_day}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.title}>fixed costs till next payday</Text>
        <Text style={styles.title}>{overview?.fixed_costs_till_next_payday}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.title}>next payday</Text>
        <Text style={styles.title}>{overview?.next_payday}</Text>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  }
});

