import {AppProvider, useAppContext} from './context/AppContext';
import {Platform, StyleSheet, View} from 'react-native';
import React, { useEffect, useState } from 'react';
import {SafeAreaProvider, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {CodePage} from './components/code/CodePage';
import {EmailPage} from './components/email/EmailPage';
import {HomePage} from './components/home/HomePage';
import {MobileNavigation} from './components/sidebar/MobileNavigation';
import {MusicPage} from './components/music/MusicPage';
import {Sidebar} from './components/sidebar/Sidebar';
import {TransparentWindow} from './components/TransparentWindow';
import {glass} from './components/theme';
import {player} from './components/music/player';
import {useCompactLayout} from './components/useCompactLayout';
import {useThemedStyles} from './components/theme';

// SwiftUI laid content out inside a 32pt top safe area, which cleared the
// window buttons for free. React Native has no such inset on macOS, so the
// traffic lights have to be cleared manually.
const TITLEBAR_INSET = 48;

const APPLICATIONS = {
  email: EmailPage,
  home: HomePage,
  code: CodePage,
  music: MusicPage,
};

export default function App() {
  const Root = Platform.OS === 'ios' ? SafeAreaProvider : React.Fragment;
  return (
    <Root>
      <AppProvider>
        <PlayerBridge />
        {Platform.OS === 'ios' ? <IOSAppShell /> : <AppShell />}
      </AppProvider>
    </Root>
  );
}

// Keeps the native audio player's state in the app store for as long as the
// app is mounted, independent of which page is showing.
function PlayerBridge() {
  const { set, get } = useAppContext();
  useEffect(() => player.subscribe(set, get), [set, get]);
  return null;
}

function IOSAppShell() {
  const insets = useSafeAreaInsets();
  return <AppShell insets={insets} />;
}

function AppShell({insets}) {
  const [navigationHeight, setNavigationHeight] = useState(60);
  const [appToRender, setAppToRender] = useState(() => 'home');
  const [activeSidebarItem, setActiveSidebarItem] = useState(null);
  const styles = useThemedStyles(createStyles);
  const ActiveApplication = APPLICATIONS[appToRender];
  const compact = useCompactLayout();
  const {set} = useAppContext();

  // Edge-to-edge pages keep their insets inside the scroll content, leaving
  // the viewport free to run underneath the floating navigation. The props
  // are published through the app store so any page can spread them onto
  // its ScrollView.
  useEffect(() => {
    if (!compact) { set('scrollLayout', {}); return; }
    const bottom = insets.bottom + navigationHeight + 8;
    set('scrollLayout', {
      contentContainerStyle: {
        paddingTop: insets.top + 12,
        paddingBottom: bottom + 16,
        paddingLeft: insets.left + 20,
        paddingRight: insets.right + 20,
      },
      scrollIndicatorInsets: {...insets, bottom},
      contentInsetAdjustmentBehavior: 'never',
      automaticallyAdjustsScrollIndicatorInsets: false,
    });
  }, [set, compact, navigationHeight, insets]);

  return (
    <TransparentWindow>
      <SafeAreaView
        style={[
          styles.appWrapper,
          Platform.OS !== 'macos' && styles.noTitlebar,
          compact && styles.compactWrapper,
          Platform.OS === 'macos' && styles.titlebar,
          compact && styles.edgeWrapper,
        ]}
      >
        {!compact && (
          <Sidebar
            activeSidebarItem={activeSidebarItem}
            setActiveSidebarItem={setActiveSidebarItem}
            currentlyActive={appToRender}
            setActiveApp={setAppToRender}
          />
        )}

        <View style={[styles.content, compact && styles.compactContent, compact && styles.edgeContent]}>
          <ActiveApplication activeSidebarItem={activeSidebarItem} />
        </View>
        {compact && (
          <View
            pointerEvents="box-none"
            onLayout={event => setNavigationHeight(event.nativeEvent.layout.height)}
            style={compact && {position: 'absolute', bottom: insets.bottom + 8, left: insets.left + 8, right: insets.right + 8}}
          >
          <MobileNavigation
            currentlyActive={appToRender}
            setActiveApp={setAppToRender}
            activeSidebarItem={activeSidebarItem}
            setActiveSidebarItem={setActiveSidebarItem}
          />
          </View>
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
    paddingTop: TITLEBAR_INSET,
  },
  titlebar: { paddingTop: TITLEBAR_INSET },
  edgeWrapper: {padding: 0, paddingTop: 0, gap: 0},
  edgeContent: {padding: 0, paddingHorizontal: 0, borderRadius: 0},
  noTitlebar: { paddingTop: 12 },
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
