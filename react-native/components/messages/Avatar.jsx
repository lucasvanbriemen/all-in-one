import {Image, StyleSheet, Text, View} from 'react-native';
import React, {useState} from 'react';
import {useThemedStyles} from '../theme';

function initials(name) {
  const words = (name || '').replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// The avatar route answers 404 for chats without a picture, so a failed load falls back to initials too.
export const Avatar = React.memo(function Avatar({uri, name, size = 32, style}) {
  const styles = useThemedStyles(createStyles);
  const [failedUri, setFailedUri] = useState(null);
  const shape = {width: size, height: size, borderRadius: size / 2};

  if (uri && failedUri !== uri) {
    return <Image source={{uri}} style={[shape, style]} onError={() => setFailedUri(uri)} />;
  }

  return (
    <View style={[shape, styles.fallback, style]}>
      <Text style={[styles.initials, {fontSize: size * 0.4}]}>{initials(name)}</Text>
    </View>
  );
});

const createStyles = colors => StyleSheet.create({
  fallback: {
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.onSecondary,
    fontWeight: '600',
  },
});
