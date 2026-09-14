import {AppProvider, useAppContext} from './context/AppContext';
import {Platform, StyleSheet, View} from 'react-native';
import React, { useEffect, useState } from 'react';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

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
        <AppShell />
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

function AppShell() {
  const [appToRender, setAppToRender] = useState(() => 'home');
  const [activeSidebarItem, setActiveSidebarItem] = useState(null);
  const styles = useThemedStyles(createStyles);
  const ActiveApplication = APPLICATIONS[appToRender];
  const compact = useCompactLayout();

  // Edge-to-edge pages keep their insets inside the scroll content, leaving
  // the viewport free to run underneath the floating navigation. The props
  // are published through the app store so any page can spread them onto
  // its ScrollView.
  
  return (
    <TransparentWindow>
      <SafeAreaView style={[styles.appWrapper, compact && styles.compactWrapper, compact && styles.edgeWrapper]}>
        {!compact && (
          <Sidebar activeSidebarItem={activeSidebarItem} setActiveSidebarItem={setActiveSidebarItem} currentlyActive={appToRender} setActiveApp={setAppToRender} />
        )}

        <View style={[styles.content, compact && styles.compactContent, compact && styles.edgeContent]}>
          <ActiveApplication activeSidebarItem={activeSidebarItem} />
        </View>
        {compact && (
          <View style={compact && {position: 'absolute', bottom: 8, left: 16, right: 16}}>
            <MobileNavigation currentlyActive={appToRender} setActiveApp={setAppToRender} activeSidebarItem={activeSidebarItem} setActiveSidebarItem={setActiveSidebarItem}/>
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
  },
  edgeWrapper: {padding: 0, paddingTop: 0, gap: 0},
  edgeContent: {padding: 0, paddingHorizontal: 0, borderRadius: 0},
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
