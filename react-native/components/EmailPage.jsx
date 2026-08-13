import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {EmailContent} from './EmailContent';
import {EmailListing} from './EmailListing';
import {useThemedStyles} from './theme';

export function EmailPage({selection, onSelect}) {
  const styles = useThemedStyles(createStyles);
  // `selection` is the sidebar's mailbox path; which email is open within that
  // mailbox is local to this page.
  const [selectedEmail, setSelectedEmail] = useState(null);

  return (
    <View style={styles.content}>
      <View style={styles.listing}>
        <EmailListing
          selection={selection}
          onSelect={onSelect}
          selectedEmail={selectedEmail}
          onSelectEmail={setSelectedEmail}
        />
      </View>
      <View style={styles.body}>
        <EmailContent email={selectedEmail} />
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  listing: {
    flex: 1,
  },
  body: {
    flex: 2,
  },
});
