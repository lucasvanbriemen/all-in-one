import {StyleSheet, View} from 'react-native';

import {EmailContent} from './EmailContent';
import {EmailListing} from './EmailListing';
import React from 'react';
import {useThemedStyles} from './theme';

export function EmailPage({selection, onSelect}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.content}>
      <View style={styles.listing}>
        <EmailListing selection={selection} onSelect={onSelect} />
      </View>
      <View style={styles.body}>
        <EmailContent />
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
