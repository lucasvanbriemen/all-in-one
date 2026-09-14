import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useState} from 'react';

import {EmailContent} from './EmailContent';
import {EmailListing} from './EmailListing';
import {useCompactLayout} from '../useCompactLayout';
import {useThemedStyles} from '../theme';

export function EmailPage({activeSidebarItem}) {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  // `selection` is the sidebar's mailbox path; which email is open within that
  // mailbox is local to this page.
  const [selectedEmail, setSelectedEmail] = useState(null);

  return (
    <View style={styles.content}>
      <View style={[styles.listing, compact && selectedEmail && styles.hidden]}>
        <EmailListing activeSidebarItem={activeSidebarItem} selectedEmail={selectedEmail} onSelectEmail={setSelectedEmail} />
      </View>
      <View style={[styles.body, compact && !selectedEmail && styles.hidden]}>
        {compact && (
          <Pressable onPress={() => setSelectedEmail(null)} style={styles.back}>
            <Text style={styles.backText}>‹ Back to inbox</Text>
          </Pressable>
        )}
        <EmailContent email={selectedEmail} />
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  hidden: {
    display: 'none'
  },
  back: {
    justifyContent: 'center'
  },
  backText: {
    color: colors.primary,
    fontSize: 16
  },
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
