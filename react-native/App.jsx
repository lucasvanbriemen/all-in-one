import {AppProvider, useAppContext} from './context/AppContext';
import {Platform, StyleSheet, View} from 'react-native';
import React, { useEffect, useState } from 'react';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

import {CodePage} from './components/code/CodePage';
import {EmailPage} from './components/email/EmailPage';
import {HomePage} from './components/home/HomePage';
import {MessagesPage} from './components/messages/MessagesPage';
import {MobileNavigation} from './components/sidebar/MobileNavigation';
import {MoneyPage} from './components/money/MoneyPage';
import {MusicPage} from './components/music/MusicPage';
import {NowPlayingBar} from './components/music/NowPlayingBar';
import {NowPlayingDrawer} from './components/music/NowPlayingDrawer';
import {SeasonalRoot} from './components/seasonal/SeasonalRoot';
import {Sidebar} from './components/sidebar/Sidebar';
import {SnowCap} from './components/seasonal/SnowCap';
import {StringLights} from './components/seasonal/StringLights';
import {TransparentWindow} from './components/TransparentWindow';
import {glass} from './components/theme';
import {player} from './components/music/player';
import {openSource, push} from './components/push';
import {useCompactLayout} from './components/useCompactLayout';
import {useKeyCommand} from './components/useKeyCommand';
import {SearchModal} from './components/home/SearchModal';
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
        <SearchShortcut />
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

// ⌘K opens search.
function SearchShortcut() {
  const {set, get} = useAppContext();
  useKeyCommand(['meta', 'k'], () => openSearch(set, get));
  return null;
}

function openSearch(set, get) {
  let isOpen = get('app.showSearch') || false;

  set('app.showSearch', !isOpen);
}

// Registers for notifications and requests permission on app launch
function PushBridge() {
  const {set} = useAppContext();

  useEffect(() => {
    const unsubscribe = push.subscribe(({source}) => openSource(set, source));
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
      <SeasonalRoot>
        <SafeAreaView style={[styles.appWrapper, compact && styles.compactWrapper, compact && styles.edgeWrapper]}>
          {!compact && <Sidebar />}

          <View style={[styles.content, compact && styles.compactContent, compact && styles.edgeContent]}>
            {!compact && <SnowCap maxHeight={14} inset={18} />}
            <ActiveApplication />
            <StringLights />
          </View>

          {compact && (
            <>
              <View style={{position: 'absolute', bottom: 12, left: 12, right: 12}} onLayout={event => set('app.bottomInset', event.nativeEvent.layout.height + 8)}>
                <NowPlayingBar />
                <MobileNavigation />
              </View>
              <NowPlayingDrawer />
            </>
          )}
        </SafeAreaView>
      </SeasonalRoot>
      <SearchModal />
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
    ...glass(colors, { variant: 'panel' }),
  },
});
