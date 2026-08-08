import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {EmailListItem} from './EmailListItem';
import {api} from './api';
import {useThemedStyles} from './theme';

export function EmailListing({selection, onSelect}) {
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
      <ScrollView>
        <Text style={styles.title}>{selection}</Text>

        {items.map(item => (
          <EmailListItem key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flex: 1,
  },
  list: {
    padding: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '400',
    color: colors.onSurface,
  },
});
