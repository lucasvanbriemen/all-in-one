import React, {useState} from 'react';
import {SidebarMaterial, TransparentWindow} from './components/TransparentWindow';
import {StyleSheet, Text, View} from 'react-native';

import {Sidebar} from './components/Sidebar';
import {labelColor} from './components/theme';

// SwiftUI laid content out inside a 32pt top safe area, which cleared the
// window buttons for free. React Native has no such inset on macOS, so the
// traffic lights have to be cleared manually.
const TITLEBAR_INSET = 32;

const ITEMS = ['Emails'];

export default function App() {
  const [selection, setSelection] = useState(null);

  return (
    <TransparentWindow>
      <View style={styles.layout}>
        <SidebarMaterial>
          <Sidebar
            items={ITEMS}
            selection={selection}
            onSelect={setSelection}
          />
        </SidebarMaterial>

        <View style={styles.content}>
          <Text style={styles.title}>{selection ?? 'Hello, world!'}</Text>
        </View>
      </View>
    </TransparentWindow>
  );
}

const styles = StyleSheet.create({
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
    color: labelColor,
  },
});
