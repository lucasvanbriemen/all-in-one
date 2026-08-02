import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {api} from './api';
import {useThemedStyles} from './theme';

export function Email({selection, onSelect}) {
  const [items, setItems] = useState([]);
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    api
      .get('/meta_data')
      .then(data => {
        setItems(data.config.email);
      })
  }, []);

  return (
    <View style={styles.content}>
      <Text style={styles.title}>Hey</Text>
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
