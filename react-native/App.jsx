import React, {useState} from 'react';
import {SidebarMaterial, TransparentWindow} from './components/TransparentWindow';
import {StyleSheet, View} from 'react-native';

import {EmailPage} from './components/EmailPage';
import {Sidebar} from './components/Sidebar';
import {useThemedStyles} from './components/theme';

// SwiftUI laid content out inside a 32pt top safe area, which cleared the
// window buttons for free. React Native has no such inset on macOS, so the
// traffic lights have to be cleared manually.
const TITLEBAR_INSET = 32;

const APPLICATIONS = {EmailPage};

const APPLICATION_TO_RENDER = "EmailPage";

export default function App() {
  const [selection, setSelection] = useState(null);
  const styles = useThemedStyles(createStyles);
  const ActiveApplication = APPLICATIONS[APPLICATION_TO_RENDER];

  return (
    <TransparentWindow>
      <View style={styles.layout}>
        <SidebarMaterial>
          <Sidebar selection={selection} onSelect={setSelection} />
        </SidebarMaterial>

        <ActiveApplication selection={selection} onSelect={setSelection} />
      </View>
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
  title: {
    fontSize: 26,
    fontWeight: '400',
    color: colors.onSurface,
  },
});
