import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {CodeEditor} from './CodeEditor';
import {EmailContent} from './EmailContent';
import {EmailListing} from './EmailListing';
import {glass, useThemedStyles} from './theme';

export function CodePage({selection, onSelect}) {
  const styles = useThemedStyles(createStyles);
  const [source, setSource] = useState('// some comment\n');

  return (
    <View style={styles.editor}>
      <CodeEditor value={source} language="javascript" onChange={setSource} />
    </View>
  );


  // const styles = useThemedStyles(createStyles);
  // // `selection` is the sidebar's mailbox path; which email is open within that
  // // mailbox is local to this page.
  // const [selectedEmail, setSelectedEmail] = useState(null);

  // return (
  //   <View style={styles.content}>
  //     <View style={styles.listing}>
  //       <EmailListing
  //         selection={selection}
  //         onSelect={onSelect}
  //         selectedEmail={selectedEmail}
  //         onSelectEmail={setSelectedEmail}
  //       />
  //     </View>
  //     <View style={styles.body}>
  //       <EmailContent email={selectedEmail} />
  //     </View>
  //   </View>
  // );
}

const createStyles = colors => StyleSheet.create({
  editor: {
    ...glass(colors),
    flex: 1,
    borderRadius: 16,
    // Monaco paints its own opaque surface right up to the edge, so the
    // rounded corners only hold if the container clips it.
    overflow: 'hidden',
    marginRight: 32,
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
