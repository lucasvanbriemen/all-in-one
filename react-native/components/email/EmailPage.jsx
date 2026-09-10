import React from 'react';
import {StyleSheet, View} from 'react-native';

import {EmailContent} from './EmailContent';
import {EmailListing} from './EmailListing';
import {useAppContext} from '../context/ContextProvider';
import {useThemedStyles} from '../theme';

export function EmailPage({activeSidebarItem}) {
  const styles = useThemedStyles(createStyles);
  // The open email is kept in the shared context registry so it is remembered
  // when navigating away from the email app and back.
  const [selectedEmail, setSelectedEmail] = useAppContext('email.selected');

  return (
    <View style={styles.content}>
      <View style={styles.listing}>
        <EmailListing activeSidebarItem={activeSidebarItem} selectedEmail={selectedEmail} onSelectEmail={setSelectedEmail} />
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
    gap: 32,
  },
  listing: {
    flex: 1,
  },
  body: {
    flex: 2,
  },
});
