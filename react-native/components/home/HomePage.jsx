import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {EmailContent} from '../EmailContent';
import {EmailListing} from '../EmailListing';
import {useThemedStyles} from '../theme';

export function HomePage({selection, onSelect}) {
  const styles = useThemedStyles(createStyles);
  // `selection` is the sidebar's mailbox path; which email is open within that
  // mailbox is local to this page.
  const [selectedEmail, setSelectedEmail] = useState(null);

  return (
    <View style={styles.content}>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flex: 1,
    flexDirection: 'row',
    gap: 32,
  },
  listing: {
    flex: 1,
  },
  body: {
    flex: 2,
  },
});
