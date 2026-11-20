import {Button, Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useCallback, useEffect, useRef, useState} from 'react';

import {CodeEditor} from '../CodeEditor';
import {FileTree} from './FileTree';
import {SearchSidebar} from './SearchSidebar';
import {Terminal} from './Terminal';
import {HiddenOrnament} from '../seasonal/Grinch';
import {WorkaholicBadge} from '../seasonal/WorkaholicBadge';
import {fileSystem} from '../fileSystem';
import {useAppContext} from '../../context/AppContext';

const AUTO_SAVE_DELAY = 800;

// Listing a key here does not decide whether JS sees it — every key on the
// first responder is emitted and bubbles as `onKeyDown` regardless. What this
// does is claim the key so macOS stops handling it itself, which is what keeps
// Cmd+P off the print dialog and Escape from beeping.
const KEY_DOWN_EVENTS = [
  {key: 'p', metaKey: true},
  {key: 'f', metaKey: true, shiftKey: true},
  {key: 'w', metaKey: true},
  {key: 'Escape'},
];

export function GitPage() {
  const { get, set } = useAppContext()

  const styles = useThemedStyles(createStyles);
  const [source, setSource] = useState('// some comment\n');
  const [currentFile, setCurrentFile] = useState(null);
  // Where the editor should put the cursor once the file is shown. Set by a
  // code search result; the nonce lets the same line be requested twice.
  const [position, setPosition] = useState(null);
  const [openedFiles, setOpenedFiles] = useState([]);
  const [projectRoot, setProjectRoot] = useState(null);
  // Which search the sidebar is showing, or null when it was closed with
  // Escape. Mirrors VS Code: Cmd+P is quick-open for files, Cmd+Shift+F is
  // search in files.
  const [searching, setSearching] = useState(null);

  const [terminals, setTerminals] = useState([]);
  const [visibleTerminal, setVisibleTerminal] = useState(null);

  const page = useRef(null);

 
  useEffect(() => {
    if (projectRoot && terminals.length === 0) {
      const newTerminal = { id: Date.now(), visible: true };
      setTerminals([newTerminal]);
      setVisibleTerminal(newTerminal.id);
    }
  }, [projectRoot, terminals.length]);


  const save = useCallback(
    async (contents = source) => {
      if (!currentFile) {
        return;
      }

      await fileSystem.writeFile(projectRoot, currentFile, contents);
    },
    [currentFile, source, projectRoot],
  );

  const openFile = useCallback(
    async (path, target = null) => {
      // The outgoing file first — the debounce below may still be pending, and
      // it is cancelled the moment `currentFile` changes.
      await save();

      const response = await fileSystem.readFile(projectRoot, path);
      const contents = response.contents ?? '';

      let currentOpenedFiles = [...openedFiles];
      if (!currentOpenedFiles.includes(path)) {
        currentOpenedFiles.push(path);
        setOpenedFiles(currentOpenedFiles);
      }

      setCurrentFile(path);

      setSource(contents);
      setCurrentFile(path);
      setPosition(target ? {...target, nonce: Date.now()} : null);
    },
    [save, projectRoot, openedFiles, setOpenedFiles],
  );

  // The buffer is written once it stops moving. Clearing the timer on every
  // change is also what makes switching files safe: a write scheduled against
  // one path can never land on the next one.
  useEffect(() => {
    if (!currentFile) {
      return;
    }

    const timer = setTimeout(() => save(source), AUTO_SAVE_DELAY);

    return () => clearTimeout(timer);
  }, [currentFile, source, save]);

  // Cmd+P reaches us three ways depending on where focus sits: through the
  // `keyDownEvents` chain when it is on a native view, through Monaco's own
  // binding when it is in the editor's WebView, and through the document on
  // the web build. All three land here.
  const openSearch = useCallback(mode => {
    set('app.activeSidebarItem', 'search');
    setSearching(mode);
  }, [set]);

  // Close the current open file and show the next one if there is one. Shared
  // by the native key handler and the WebViews, which hand Cmd+W back the same
  // way they hand back Cmd+P: a keystroke left to WebKit closes the window.
  const closeCurrentFile = useCallback(() => {
    const newOpenedFiles = openedFiles.filter(file => file !== currentFile);
    setOpenedFiles(newOpenedFiles);
    setCurrentFile(newOpenedFiles[0] ?? null);
  }, [openedFiles, currentFile]);

  const onKeyDown = useCallback(event => {
    const {key, metaKey, ctrlKey, shiftKey} = event.nativeEvent ?? event;

    if (key === 'p' && (metaKey || ctrlKey)) {
      event.preventDefault?.();
      openSearch('files');
    }

    if ((key === 'f' || key === 'F') && (metaKey || ctrlKey) && shiftKey) {
      event.preventDefault?.();
      openSearch('code');
    }

    if (key === 'w' && (metaKey || ctrlKey)) {
      event.preventDefault?.();
      closeCurrentFile();
    }

    if (key === 'Escape') {
      setSearching(null);
    }
  }, [openSearch, closeCurrentFile]);

  // Nothing in this tree takes focus on its own, and on macOS key events are
  // only emitted from the first responder — a plain View never becomes one, and
  // clicks deliberately don't move focus. Without this the shortcut only works
  // while Monaco holds focus, because Monaco is the only thing here that does.
  useEffect(() => {
    page.current?.focus?.();
  }, []);

  // Closing hands focus back, so the next Cmd+P outside the editor still lands.
  useEffect(() => {
    if (!searching) {
      page.current?.focus?.();
    }
  }, [searching]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  const openSearchFile = useCallback(
    async path => {
      setSearching(false);
      await openFile(path);
    },
    [openFile],
  );

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
