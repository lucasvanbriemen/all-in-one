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
      <Text style={styles.title}>{overview?.balance_min_fixed_costs} balance min fixed costs</Text>
      <Text style={styles.title}>{overview?.money_per_day} money per day</Text>
      <Text style={styles.title}>{overview?.fixed_costs_till_next_payday} fixed costs till next payday</Text>
      <Text style={styles.title}>{overview?.next_payday} next payday</Text>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
  }
});

