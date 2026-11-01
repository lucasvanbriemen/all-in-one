import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {EmailListItem} from './EmailListItem';
import {HiddenOrnament} from '../seasonal/Grinch';
import {useNaughtySenders} from '../seasonal/NaughtyNice';
import { RefreshControl } from 'react-native';
import {api} from '../api';
import {useAppContext} from '../../context/AppContext';
import {useBottomInset} from '../useCompactLayout';
import {useThemedStyles} from '../theme';

export function EmailListing() {
  const [emails, setEmails] = useState([]);
  const styles = useThemedStyles(createStyles);
  const { get, set } = useAppContext();
  const [emailRefreshing, setEmailRefreshing] = useState(false);
  const bottomInset = useBottomInset();
  const naughty = useNaughtySenders();

  useEffect(() => {
    api.get('/email/' + get('app.activeSidebarItem')).then(data => {
      setEmails(data?.emails ?? []);
    });
  }, [get]);

  function getEmails() {
    return api.get('/email/' + get('app.activeSidebarItem')).then(data => {
      setEmails(data?.emails ?? []);
    });
  }

  return (
    <View style={styles.content}>
      <ScrollView contentContainerStyle={{paddingBottom: bottomInset}} refreshControl={<RefreshControl refreshing={emailRefreshing} onRefresh={() => {setEmailRefreshing(true); getEmails().finally(() => setEmailRefreshing(false));}} />}>
        {emails.map((email, index) => (
          <React.Fragment key={email.id}>
            {emails[index - 1]?.date !== email.date && (
              <Text style={styles.title}>{email.date}</Text>
            )}

            <EmailListItem item={email} coal={naughty.has(email.sender_name)} isSelected={get('email.selectedEmailId') == email.id} onPress={() => set('email.selectedEmailId', email.id)} />
          </React.Fragment>
        ))}
        <HiddenOrnament spot="email" style={{alignSelf: 'center', margin: 16}} />
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
