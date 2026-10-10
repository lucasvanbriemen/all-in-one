import {AppProvider, useAppContext} from './context/AppContext';
import React, { useEffect, useState } from 'react';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {Platform, StyleSheet, View} from 'react-native';

import {CodePage} from './components/code/CodePage';
import {EmailPage} from './components/email/EmailPage';
import {HomePage} from './components/home/HomePage';
import {MessagesPage} from './components/messages/MessagesPage';
import {MobileNavigation} from './components/sidebar/MobileNavigation';
import {MoneyPage} from './components/money/MoneyPage';
import {MusicPage} from './components/music/MusicPage';
import {NowPlayingBar} from './components/music/NowPlayingBar';
import {NowPlayingDrawer} from './components/music/NowPlayingDrawer';
import {Sidebar} from './components/sidebar/Sidebar';
import {TransparentWindow} from './components/TransparentWindow';
import {glass} from './components/theme';
import {player} from './components/music/player';
import {push} from './components/push';
import {useCompactLayout} from './components/useCompactLayout';
import {useThemedStyles} from './components/theme';

const APPLICATIONS = {
  email: EmailPage,
  home: HomePage,
  code: CodePage,
  music: MusicPage,
  money: MoneyPage,
  messages: MessagesPage,
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <PlayerBridge />
        <PushBridge />
        <AppShell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

// Keeps the native audio player's state in the app store for as long as the
// app is mounted, independent of which page is showing.
function PlayerBridge() {
  const {set, get} = useAppContext();
  useEffect(() => player.subscribe(set, get), [set, get]);
  return null;
}

// Registers for notifications and requests permission on app launch
function PushBridge() {
  const {set} = useAppContext();

  useEffect(() => {
    const unsubscribe = push.subscribe(({source}) => {
      const [kind, mailbox, emailId] = String(source || '').split('.');
      if (kind !== 'email' || !mailbox || !emailId) return;

      set('app.activeApp', 'email');
      set('app.activeSidebarItem', mailbox);
      set('email.selectedEmailId', Number(emailId));
    });
    push.requestPermission();
    return unsubscribe;
  }, [set]);

  return null;
}

function AppShell() {
  const {get, set} = useAppContext();

  const styles = useThemedStyles(createStyles);
  const ActiveApplication = APPLICATIONS[get("app.activeApp") || "home"];
  const compact = useCompactLayout();

  return (
    <TransparentWindow>
      <SafeAreaView style={[styles.appWrapper, compact && styles.compactWrapper, compact && styles.edgeWrapper]}>
        {!compact && <Sidebar />}

        <View style={[styles.content, compact && styles.compactContent, compact && styles.edgeContent]}>
          <ActiveApplication />
        </View>

        {compact && (
          <>
            <View style={{position: 'absolute', bottom: 12, left: 12, right: 12}} onLayout={event => set('app.bottomInset', event.nativeEvent.layout.height + 24)}>
              <NowPlayingBar />
              <MobileNavigation />
            </View>
            <NowPlayingDrawer />
          </>
        )}
      </SafeAreaView>
    </TransparentWindow>
  );
}

const createStyles = colors => StyleSheet.create({
  appWrapper: {
    flex: 1,
    padding: 16,
    gap: 16,
    flexDirection: 'row',
  },
  // On iOS SafeAreaView already adds the notch/status-bar inset on top of this
  // padding; the extra 48 only clears the transparent titlebar on macOS/web.
  edgeWrapper: {padding: 0, paddingTop: Platform.OS === 'ios' ? 0 : 48, gap: 0},
  edgeContent: {paddingBottom: 0, paddingHorizontal: 16, borderRadius: 0},
  compactWrapper: { flexDirection: 'column', padding: 8, gap: 8 },
  compactContent: {
    paddingHorizontal: 12,
    minHeight: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  content: {
    minWidth: 0,
    flex: 1,
    padding: 16,
    paddingBottom: 0,
    paddingTop: 0,
    borderRadius: 16,
    ...glass(colors, { variant: 'subtle' }),
  },
});
