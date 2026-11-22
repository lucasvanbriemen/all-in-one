import {AppProvider, store, useAppContext} from './context/AppContext';
import {AppState, Platform, StyleSheet, View} from 'react-native';
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
import {LightsPage} from './components/lights/LightsPage';
import {SearchModal} from './components/home/SearchModal';
import {useThemedStyles} from './components/theme';

const APPLICATIONS = {
  email: EmailPage,
  home: HomePage,
  code: CodePage,
  music: MusicPage,
  money: MoneyPage,
  messages: MessagesPage,
  lights: LightsPage,
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
  useEffect(() => player.subscribe(store.set, store.get), []);
  return null;
}

function SearchShortcut() {
  const {set, get} = useAppContext();
  useKeyCommand(['meta', 'k'], () => openSearch(set, get));
  return null;
}

function openSearch(set, get) {
  let isOpen = get('app.showSearch') || false;

  set('app.showSearch', !isOpen);
}

// Registers for notifications and requests permission on app launch, and
// keeps Notification Center in step with what is still unread.
function PushBridge() {
  const {get, set} = useAppContext();
  const activeChannel = get('messages.activeChannel');
  const selectedEmailId = get('email.selectedEmailId');

  useEffect(() => {
    const unsubscribe = push.subscribe(({source}) => openSource(set, source));
    push.requestPermission();
    return unsubscribe;
  }, [set]);

  // On launch and every return to the foreground: things may have been read
  // elsewhere (the Mac, the home screen) while the app was in the background.
  useEffect(() => {
    push.syncDelivered();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') push.syncDelivered();
    });
    return () => sub.remove();
  }, []);

  // Opening a chat or email marks it read on the server (the messages/email
  // fetch does that), so sync shortly after it has had time to land.
  useEffect(() => {
    if (!activeChannel && !selectedEmailId) return;
    const timer = setTimeout(() => push.syncDelivered(), 1500);
    return () => clearTimeout(timer);
  }, [activeChannel, selectedEmailId]);

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

            {!compact && (
              <View style={styles.pill} onLayout={event => {
                const height = event.nativeEvent.layout.height;
                set('app.bottomInset', height > 0 ? height + 16 : 0);
              }}>
                <NowPlayingBar floating />
              </View>
            )}
          </View>

          {compact && (
            <>
              <View style={{position: 'absolute', bottom: 12, left: 12, right: 12}} onLayout={event => set('app.bottomInset', event.nativeEvent.layout.height + 8)}>
                <NowPlayingBar />
                <MobileNavigation />
              </View>
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
  pill: {
    position: 'absolute',
    right: 16,
    bottom: 16,
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
