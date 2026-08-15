import {CALLBACK_URL, LOGIN_URL, auth, tokenFromCallback} from './auth';

import React from 'react';
import {StyleSheet} from 'react-native';
import {WebView} from 'react-native-webview';

/**
 * The login screen is login.ltvb.nl itself.
 *
 * Rebuilding the form in React Native would mean keeping a second copy of a
 * page that already exists — and one that couldn't reach the shared stylesheets
 * or the background images it is built from, so it would look almost right and
 * drift from there. Loading the real page instead means it stays identical for
 * free, and anything added to it later (a second factor, a different provider)
 * works here without a change on this side.
 *
 * The handoff is the one the web apps already use: log in, and the app redirects
 * to `redirect` with `?auth_token=` on it. That redirect is a signal rather than
 * a page, so it is cancelled before it loads and the token is kept.
 */
export function Login() {
  return (
    <WebView
      style={styles.login}
      source={{uri: `${LOGIN_URL}?redirect=${encodeURIComponent(CALLBACK_URL)}`}}
      onShouldStartLoadWithRequest={request => {
        const token = tokenFromCallback(request.url);

        if (!token) {
          return true;
        }

        // App is subscribed to the session, so it swaps this screen out for the
        // mailbox on its own once this resolves. If it doesn't, the cancelled
        // navigation leaves the login form on screen to be tried again.
        auth.signInWithToken(token).catch(failure => {
          console.warn('Login failed:', failure.message);
        });

        return false;
      }}
    />
  );
}

const styles = StyleSheet.create({
  login: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
