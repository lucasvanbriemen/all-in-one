import {Image, Linking, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';

import {BASE_URL} from '../api';
import {useThemedStyles} from '../theme';

export default function FileUpload({file}) {
  const styles = useThemedStyles(createStyles);
  const uri = `${BASE_URL}/file/${file.id}`;
  const isImage = file.mimetype?.startsWith('image/');
  const [aspectRatio, setAspectRatio] = useState(4 / 3);

  useEffect(() => {
    if (isImage) Image.getSize(uri, (width, height) => setAspectRatio(width / height), () => {});
  }, [uri, isImage]);

  if (isImage) {
    return (
      <Pressable onPress={() => Linking.openURL(uri)} style={styles.fileImageWrapper}>
        <Image source={{uri}} style={[styles.fileImage, {aspectRatio}]} resizeMode="contain" />
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.fileRow} onPress={() => Linking.openURL(uri)}>
      <Text style={styles.content}>{file.filename}</Text>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  files: {
    gap: 8,
  },
  fileImageWrapper: {
    maxWidth: '100%',
  },
  fileImage: {
    width: 320,
    maxWidth: '100%',
    maxHeight: 400,
    borderRadius: 12,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  }
});
