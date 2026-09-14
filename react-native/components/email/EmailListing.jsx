import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {EmailListItem} from './EmailListItem';
import {api} from '../api';
import {useThemedStyles} from '../theme';

export function EmailListing({activeSidebarItem, selectedEmail, onSelectEmail}) {
  const [items, setItems] = useState([]);
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    api
      .get('/email/' + activeSidebarItem)
      .then(data => {
        setItems(data?.emails ?? []);
        onSelectEmail(null);
      })
  }, [activeSidebarItem, onSelectEmail]);

  return (
    <View style={styles.content}>
      <ScrollView>
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            {items[index - 1]?.date !== item.date && (
              <Text style={styles.title}>{item.date}</Text>
            )}

            <EmailListItem
              item={item}
              isSelected={selectedEmail?.id === item.id}
              onPress={() => onSelectEmail(item)}
            />
          </React.Fragment>
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
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 32,
    color: colors.onSurfaceVariant,
  },
});
