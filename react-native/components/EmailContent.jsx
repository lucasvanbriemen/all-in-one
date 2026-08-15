import {Image, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';

import {EmailBody} from './EmailBody';
import {api} from './api';
import {glass, useThemedStyles} from './theme';

export function EmailContent({email}) {
  const styles = useThemedStyles(createStyles);
  const [detail, setDetail] = useState(null);
  const emailId = email?.id;

  useEffect(() => {
    setDetail(null);

    if (!emailId) {
      return;
    }

    // The listing only carries enough to draw a row; the body comes from the
    // detail endpoint. `cancelled` keeps a slow response for a previously
    // selected email from overwriting a newer one.
    let cancelled = false;

    api
      .get('/emails/' + emailId)
      .then(data => {
        if (!cancelled) { setDetail(data); }
      })
  }, [emailId]);

  if (!email) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>No email selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Image source={{uri: email.sender_image_url}} style={styles.senderImage} />
        <View style={styles.headerInfo}>
          <Text style={styles.subject}>{email.subject}</Text>
          {detail && (
            <>
              <View style={styles.meta}>
                <Text style={styles.metaText}>{detail.sender_name}</Text>
                <Text style={styles.metaSeparator}>·</Text>
                <Text style={styles.metaText}>{detail.sender_email}</Text>
                <Text style={styles.metaSeparator}>·</Text>
                <Text style={styles.metaText}>{detail.time_ago}</Text>
              </View>
              <Text style={styles.to}>to: {detail.to}</Text>
            </>
          )}
        </View>
      </View>

      {detail && <EmailBody detail={detail} />}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  content: {
    flex: 1,
    gap: 16,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: '500',
    color: colors.secondary,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    ...glass(colors, {tint: 0.5}),
  },
  senderImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  subject: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.onSurface,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  metaSeparator: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginHorizontal: 6,
  },
  to: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
