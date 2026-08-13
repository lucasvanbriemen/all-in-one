import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {EmailListItem} from './EmailListItem';
import {api} from './api';
import {useThemedStyles} from './theme';

export function EmailListing({selection, onSelect, selectedEmail, onSelectEmail}) {
  const [items, setItems] = useState([]);
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    api
      .get('/email/' + selection)
      .then(data => {
        setItems(data?.emails ?? []);
        onSelectEmail(null);
      })
  }, [selection]);

  return (
    <View style={styles.content}>
      <ScrollView>
        {items.map(item => (
          <EmailListItem
            key={item.id}
            item={item}
            isSelected={selectedEmail?.id === item.id}
            onPress={() => onSelectEmail(item)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '400',
    color: colors.onSurface,
  },
});
