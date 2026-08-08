import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {api} from './api';
import {useThemedStyles} from './theme';

export function EmailPage({selection, onSelect}) {
  const [items, setItems] = useState([]);
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    api
      .get('/email/' + selection)
      .then(data => {
        setItems(data?.emails ?? []);
      })
  }, [selection]);

  return (
    <View style={styles.content}>
      <Text style={styles.title}>{selection}</Text>

      {items.map(item => (
        <Text key={item.id} style={styles.title}>{item.subject}</Text>
      ))}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '400',
    color: colors.onSurface,
  },
});
