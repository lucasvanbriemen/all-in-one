import React from 'react';
import {StyleSheet, View} from 'react-native';

import {CodePage} from './components/code/CodePage';
import {ContextProvider, useAppContext} from './components/context/ContextProvider';
import {EmailPage} from './components/email/EmailPage';
import {HomePage} from './components/home/HomePage';
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
  music: HomePage,
};


export default function App() {
  return (
    <ContextProvider>
      <AppShell />
    </ContextProvider>
  );
}

function AppShell() {
  const [appToRender, setAppToRender] = useAppContext('app.active', 'home');
  // Each app remembers its own sidebar item, so switching to another app and
  // back restores the mailbox / folder that was open there.
  const [sidebarSelections, setSidebarSelections] = useAppContext('sidebar.selections', {});
  const styles = useThemedStyles(createStyles);
  const ActiveApplication = APPLICATIONS[appToRender];
  const activeSidebarItem = sidebarSelections[appToRender] ?? null;

  const selectSidebarItem = (app, path) => {
    setSidebarSelections(prev => ({...(prev ?? {}), [app]: path}));
    setAppToRender(app);
  };

  return (
    <TransparentWindow>
      <View style={styles.appWrapper}>
        <Sidebar sidebarSelections={sidebarSelections} selectSidebarItem={selectSidebarItem} currentlyActive={appToRender} setActiveApp={setAppToRender} />

        <View style={styles.content}>
          <ActiveApplication activeSidebarItem={activeSidebarItem} />
        </View>
      </View>
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
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 0,
    paddingTop: 0,
    borderRadius: 16,
    ...glass(colors, {tint: 0.25}),
  },
});
