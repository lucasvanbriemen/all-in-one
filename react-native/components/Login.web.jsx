import {LOGIN_URL, auth, tokenFromUrl} from './auth';

import {useEffect} from 'react';

/**
 * Web stand-in for the native login screen.
 *
 * `react-native-webview` has no web implementation, and a static import would
 * fail the Vite build — resolving this file ahead of `Login.jsx` keeps it off
 * the web bundle entirely. An iframe is no substitute here either: the token
 * arrives as a redirect on login.ltvb.nl's own origin, which a frame won't let
 * this page read. So the web build does what the Rails app does — leaves for
 * the login page and comes back with the token on the URL.
 */
export function Login() {
  useEffect(() => {
    // The web build is its own callback: the login app is told to come back
    // here, so the token lands on this page's own URL.
    const returnTo = window.location.origin + window.location.pathname;
    const token = tokenFromUrl(window.location.search);

    if (token) {
      // Not retried by sending the browser back to the login page: that would
      // loop silently. Better to sit here than to bounce.
      auth.signInWithToken(token).catch(failure => {
        console.warn('Login failed:', failure.message);
      });

      // Same tidy-up as `clean_url` in the Rails concern: the token has been
      // taken out of the URL, so it shouldn't stay in the address bar.
      window.history.replaceState({}, '', returnTo);

      return;
    }

    window.location.assign(`${LOGIN_URL}?redirect=${encodeURIComponent(returnTo)}`);
  }, []);

  return null;
}
