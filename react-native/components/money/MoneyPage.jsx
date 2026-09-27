import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {Stat} from '../home/Stat';
import {api} from '../api';
import {format} from './format';
import {useCompactLayout} from '../useCompactLayout';
import {useThemedStyles} from '../theme';

export function MoneyPage() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const [serverData, setServerData] = useState([]);

  useEffect(() => {
    api.get('/money').then(response => {
      setServerData(response);
  
    });
  }, []);

  return (
    <View style={styles.content}>
      <View style={[styles.statsContainer, compact && styles.compactStats]}>
        {serverData && serverData?.map((data, index) => (
          <Stat key={index} value={format.money(data.value)} label={data.label} attentionLevel={data.attentionLevel}/>
        ))}
      </View>
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

