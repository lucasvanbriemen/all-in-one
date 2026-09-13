import {useTheme, useThemedStyles} from '../theme';

import React from 'react';
import {StyleSheet} from 'react-native';
import {WebView} from 'react-native-webview';

/**
 * Renders an email's HTML in a web view.
 *
 * Internal emails store a URL in `html_body` and are loaded by address.
 * External ones store the markup itself and are rendered as untrusted source
 * with JavaScript off — the same split the web app makes between a plain
 * frame and a sandboxed one.
 */
export function EmailBody({detail}) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  // Supply defaults before the message's own styles so authored email colors
  // keep their intended contrast, while unstyled messages match the app.
  const defaults = `<style>html, body { background-color: ${colors.surfaceAt1}; color: ${colors.onSurface}; }</style>`;
  const html = detail.html_body ?? '';
  const themedHtml = /<head[\s>]/i.test(html)
    ? html.replace(/<head\b[^>]*>/i, match => match + defaults)
    : defaults + html;

  return (
    <WebView
      style={styles.body}
      source={detail.internal ? {uri: detail.html_body} : {html: themedHtml}}
      originWhitelist={['*']}
      javaScriptEnabled={detail.internal}
      // An email body must never navigate the app away from itself.
      onShouldStartLoadWithRequest={request => request.navigationType !== 'click'}
    />
  );
}

const createStyles = colors => StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: colors.surfaceAt1,
    borderRadius: 16,
  },
});
