import {AppProvider, useAppContext} from './context/AppContext';
import React, { useEffect, useState } from 'react';
import {StyleSheet, View} from 'react-native';

import {CodePage} from './components/code/CodePage';
import {EmailPage} from './components/email/EmailPage';
import {HomePage} from './components/home/HomePage';
import {MobileNavigation} from './components/sidebar/MobileNavigation';
import {MusicPage} from './components/music/MusicPage';
import {NowPlayingBar} from './components/music/NowPlayingBar';
import {NowPlayingDrawer} from './components/music/NowPlayingDrawer';
import {SafeAreaView} from 'react-native-safe-area-context';
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
};

export default function App() {
  return (
    <AppProvider>
      <PlayerBridge />
      <PushBridge />
      <AppShell />
    </AppProvider>
  );
}

// Keeps the native audio player's state in the app store for as long as the
// app is mounted, independent of which page is showing.
function PlayerBridge() {
  const {set, get} = useAppContext();
  useEffect(() => player.subscribe(set, get), [set, get]);
  return null;
}

// Registers for notifications and requests permission on app launch.
function PushBridge() {
  push.subscribe();
  push.requestPermission();
  return null;
}

function AppShell() {
  const {get} = useAppContext();

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
            <View style={{position: 'absolute', bottom: 12, left: 12, right: 12}}>
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
  edgeWrapper: {padding: 0, paddingTop: 48, gap: 0},
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
