import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {EmailPage} from './components/EmailPage';
import {Login} from './components/Login';
import {Sidebar} from './components/Sidebar';
import {TransparentWindow} from './components/TransparentWindow';
import {auth} from './components/auth';
import {useThemedStyles} from './components/theme';

// SwiftUI laid content out inside a 32pt top safe area, which cleared the
// window buttons for free. React Native has no such inset on macOS, so the
// traffic lights have to be cleared manually.
const TITLEBAR_INSET = 48;

const APPLICATIONS = {EmailPage};

const APPLICATION_TO_RENDER = "EmailPage";

export default function App() {
  const [selection, setSelection] = useState(null);
  // `undefined` while the stored session is still being read, `null` once it is
  // settled that there isn't one.
  const [session, setSession] = useState(undefined);
  const styles = useThemedStyles(createStyles);
  const ActiveApplication = APPLICATIONS[APPLICATION_TO_RENDER];

  useEffect(() => {
    // Subscribed before restoring so the first publish can't be missed, and
    // kept subscribed so an expiry mid-session — which `api.js` turns into a
    // sign-out on the first 401 — lands here too.
    const unsubscribe = auth.subscribe(setSession);

    auth.restore();

    return unsubscribe;
  }, []);

  function content() {
    if (session === undefined) {
      // A flash of the login form before the stored token is read would be a
      // lie; the window stays empty for the one tick it takes.
      return null;
    }

    if (session === null) {
      return <Login />;
    }

    return (
      <>
        <Sidebar selection={selection} onSelect={setSelection} />

        <ActiveApplication selection={selection} onSelect={setSelection} />
      </>
    );
  }

  return (
    <TransparentWindow>
      <View style={styles.layout}>{content()}</View>
    </TransparentWindow>
  );
}

const createStyles = colors => StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: TITLEBAR_INSET,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
