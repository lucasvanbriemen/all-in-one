import {BASE_URL, api} from '../api';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';
import {useBottomInset, useCompactLayout} from '../useCompactLayout';

export function ChannelListItem({channel}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable key={channel.id} onPress={() => openChannel(channel)} style={styles.channelItem}>
      <Text>{channel.display_name}</Text>
      <Text>{channel.last_message?.body}</Text>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  channelItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
