import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {EmailListItem} from './EmailListItem';
import {api} from '../api';
import {useAppContext} from '../../context/AppContext';
import {useThemedStyles} from '../theme';

export function EmailListing() {
  const [items, setItems] = useState([]);
  const styles = useThemedStyles(createStyles);
  const { get, set } = useAppContext();

  useEffect(() => {
    api.get('/email/' + get('app.activeSidebarItem'))
      .then(data => {
        setItems(data?.emails ?? []);
      })
  }, [get]);

  return (
    <View style={styles.content}>
      <ScrollView>
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            {items[index - 1]?.date !== item.date && (
              <Text style={styles.title}>{item.date}</Text>
            )}

            <EmailListItem item={item} isSelected={get('email.selectedEmailId') == item.id} onPress={() => set('email.selectedEmailId', item.id)} />
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
