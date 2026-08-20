import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {CodePage} from './components/CodePage';
import {EmailPage} from './components/EmailPage';
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
  code: CodePage,
};


export default function App() {
  const [APPLICATION_TO_RENDER, setApplicationToRender] = useState(() => "code");

  const [selection, setSelection] = useState(null);
  const styles = useThemedStyles(createStyles);
  const ActiveApplication = APPLICATIONS[APPLICATION_TO_RENDER];

  return (
      <TransparentWindow>
    <View style={styles.appWrapper}>

          <Sidebar selection={selection} onSelect={setSelection}  currentlyActive={APPLICATION_TO_RENDER} setActiveApp={setApplicationToRender} />

          <View style={styles.content}>
            <ActiveApplication selection={selection} onSelect={setSelection} />
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
    width: '100%',
    padding: 16,
    paddingBottom: 0,
    paddingTop: 0,
    borderRadius: 16,
    ...glass(colors, {tint: 0.25}),
  },
});
