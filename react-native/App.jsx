import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {CodePage} from './components/code/CodePage';
import {EmailPage} from './components/email/EmailPage';
import {HomePage} from './components/home/HomePage';
import {MusicPage} from './components/music/MusicPage';
import {PlayerProvider} from './components/contexts/PlayerContext';
import {Sidebar} from './components/sidebar/Sidebar';
import {TransparentWindow} from './components/TransparentWindow';
import {glass} from './components/theme';
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
  const [appToRender, setAppToRender] = useState(() => "home");

  const [activeSidebarItem, setActiveSidebarItem] = useState(null);
  const styles = useThemedStyles(createStyles);
  const ActiveApplication = APPLICATIONS[appToRender];

  return (
    <PlayerProvider>
    <TransparentWindow>
      <View style={styles.appWrapper}>
       <Sidebar activeSidebarItem={activeSidebarItem} setActiveSidebarItem={setActiveSidebarItem} currentlyActive={appToRender} setActiveApp={setAppToRender} />

        <View style={styles.content}>
          <ActiveApplication activeSidebarItem={activeSidebarItem} />
        </View>
      </View>
    </TransparentWindow>
    </PlayerProvider>
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
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 0,
    paddingTop: 0,
    borderRadius: 16,
    ...glass(colors, {tint: 0.25}),
  },
});
