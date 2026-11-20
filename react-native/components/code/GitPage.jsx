import {Button, Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {useAppContext} from '../../context/AppContext';


export function GitPage() {
  const { get, set } = useAppContext()

  return (
    <View>
      <Text>Git Page</Text>
      <Text>Test</Text>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  editor: {
    flexDirection: 'row',
    position: 'relative',
    gap: 16,
    flex: 1,
  },
  codeEditorContainer: {
    flex: 5,
    paddingTop: 16,
    paddingBottom: 16,
    borderRadius: 16,
    gap: 16,
  },
  openedFiles: {
    flexDirection: 'row',
    gap: 8,
  },
  openedFile: {
    padding: 8,
    ...glass(colors, {variant: 'subtle'}),
    borderRadius: 90,
    opacity: 0.75,
  },
  openedFileActive: {
    backgroundColor: colors.primary,
    opacity: 1,
  },
  fileTree: {
    flex: 1,
  },
  terminalTabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
  },
  terminalTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  terminalTabActive: {
    backgroundColor: colors.primary,
  },
  terminalTabText: {
    color: colors.onSurface,
  },
  terminalTabActiveText: {
    color: colors.onPrimary,
  },
  terminalPanes: {
    flex: 1,
  },
  // Every pane keeps its full size so xterm never measures a collapsed view;
  // the inactive ones are only made invisible and pushed behind the active one.
  terminalPane: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  hiddenTerminal: {
    opacity: 0,
    zIndex: 0,
  },
  terminal: {
    borderRadius: 16,
    height: 300,
    // The emulator inside draws to the edges, so the panel's own rounding has
    // to clip it — otherwise the scrollback runs out over the corners.
    overflow: 'hidden',
    ...glass(colors, {variant: 'subtle'})
  },
  openedFileText: {
    color: colors.onSurface,
  },
  openedFileActiveText: {
    color: colors.onPrimary,
  },
  noProjectRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noProjectRootText: {
    fontSize: 32,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    fontWeight: 'bold',
    opacity: 0.75,
  },
});
