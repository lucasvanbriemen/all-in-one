import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {GiftBudget} from '../seasonal/GiftBudget';
import {HiddenOrnament} from '../seasonal/Grinch';
import {Stat} from '../home/Stat';
import {useApi} from '../useApi';
import {format} from './format';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';
import {useThemedStyles} from '../theme';

export function MoneyPage() {
  const compact = useCompactLayout();
  const bottomInset = useBottomInset();
  const styles = useThemedStyles(createStyles);
  const money = useApi('/money').data;
  const statisics = money?.data ?? [];
  const recurring = money?.recurring ?? [];

  return (
    <View style={styles.content}>
      <View style={[styles.statsContainer, compact && styles.compactStats]}>
        {statisics && statisics?.map((data, index) => (
          <Stat key={index} value={format.money(data.value)} label={data.label} attentionLevel={data.attentionLevel}/>
        ))}
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: bottomInset}}>
        <GiftBudget />
        {recurring && recurring?.map((data, index) => (
          <View>
            <Text>{data.counterparty}: {format.money(data.amount)}</Text>
          </View>
        ))}
        <HiddenOrnament spot="money" style={{alignSelf: 'flex-start', margin: 16}} />
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
