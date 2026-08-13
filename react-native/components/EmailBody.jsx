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
  return (
    <WebView
      style={styles.body}
      source={detail.internal ? {uri: detail.html_body} : {html: detail.html_body}}
      originWhitelist={['*']}
      javaScriptEnabled={detail.internal}
      // An email body must never navigate the app away from itself.
      onShouldStartLoadWithRequest={request => request.navigationType !== 'click'}
    />
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
