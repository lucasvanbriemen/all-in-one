import {Pressable, StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {glass, useThemedStyles, withAlpha} from '../theme';

import {SEVERITY_COLORS} from './ui';

/**
 * One line along the bottom: branch, problems, cursor, the file's language,
 * whether the server is there. Each item is a button to the panel behind it.
 */
export function StatusBar({branch, changes, problems, cursor, language, path, serverUp, saving, languageServer, onShowGit, onShowProblems, onGoToLine, onRetryServer}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.bar} testID="status-bar">
      <Item onPress={onShowGit} styles={styles}>
        {branch ? `⎇ ${branch}${changes ? ` · ${changes}` : ''}` : ''}
      </Item>

      <Item onPress={onShowProblems} styles={styles} testID="status-problems">
        <Text style={{color: problems?.errors ? SEVERITY_COLORS.error : styles.text.color}}>⨯ {problems?.errors ?? 0}</Text>
        <Text>  </Text>
        <Text style={{color: problems?.warnings ? SEVERITY_COLORS.warning : styles.text.color}}>⚠ {problems?.warnings ?? 0}</Text>
      </Item>

      <View style={{flex: 1}} />

      {saving && <Item styles={styles}>saving…</Item>}

      {cursor && <Item onPress={onGoToLine} styles={styles}>Ln {cursor.line}, Col {cursor.column}</Item>}

      {language && <Item styles={styles}>{language}{languageServer ? ` · ${languageServer}` : ''}</Item>}

      <Item onPress={serverUp === false ? onRetryServer : undefined} styles={styles} testID="status-server">
        <Text style={{color: serverUp === false ? SEVERITY_COLORS.error : serverUp ? '#3fb950' : styles.text.color}}>●</Text>
        <Text> {serverUp === false ? 'server down — retry' : serverUp ? 'server' : 'connecting'}</Text>
      </Item>
    </View>
  );
}

function Item({children, onPress, styles, testID}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.item} testID={testID}>
      <Text style={styles.text} numberOfLines={1}>{children}</Text>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 2,
    ...glass(colors, {variant: 'subtle'}),
  },
  item: {
    paddingHorizontal: 8,
    height: 20,
    justifyContent: 'center',
    borderRadius: 6,
  },
  text: {
    color: withAlpha(colors.onSurface, 0.85),
    fontSize: 11.5,
  },
});
