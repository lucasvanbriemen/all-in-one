import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {Stat} from '../home/Stat';
import {api} from '../api';
import {format} from './format';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';
import {useThemedStyles} from '../theme';

export function MoneyPage() {
  const compact = useCompactLayout();
  const bottomInset = useBottomInset();
  const styles = useThemedStyles(createStyles);
  const [statisics, setStatisics] = useState([]);
  const [recurring, setRecurring] = useState([]);

  useEffect(() => {
    api.get('/money').then(response => {
      setStatisics(response.data);
      setRecurring(response.recurring);
    });
  }, []);

  return (
    <View style={styles.content}>
      <View style={[styles.statsContainer, compact && styles.compactStats]}>
        {statisics && statisics?.map((data, index) => (
          <Stat key={index} value={format.money(data.value)} label={data.label} attentionLevel={data.attentionLevel}/>
        ))}
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: bottomInset}}>
        {recurring && recurring?.map((data, index) => (
          <View>
            <Text>{data.counterparty}: {format.money(data.amount)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  compactStats: { flexWrap: 'wrap', gap: 8 },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
  },
});
