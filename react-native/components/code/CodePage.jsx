import {StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useCallback, useEffect, useRef, useState} from 'react';

import {CodeEditor} from '../CodeEditor';
import {FileTree} from './FileTree';
import {SearchModal} from './SearchModal';
import {Terminal} from './Terminal';
import {fileSystem} from '../fileSystem';

const AUTO_SAVE_DELAY = 800;

// Listing a key here does not decide whether JS sees it — every key on the
// first responder is emitted and bubbles as `onKeyDown` regardless. What this
// does is claim the key so macOS stops handling it itself, which is what keeps
// Cmd+P off the print dialog and Escape from beeping.
const KEY_DOWN_EVENTS = [
  {key: 'p', metaKey: true},
  {key: 'Escape'},
];

export function CodePage({selection, onSelect}) {
  const styles = useThemedStyles(createStyles);
  const [source, setSource] = useState('// some comment\n');
  const [currentFile, setCurrentFile] = useState(null);
  const [openedFiles, setOpenedFiles] = useState([]);
  const [projectRoot, setProjectRoot] = useState(null);
  const [searching, setSearching] = useState(false);
  const page = useRef(null);

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
    async path => {
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
  const onKeyDown = useCallback(event => {
    const {key, metaKey, ctrlKey} = event.nativeEvent ?? event;

    if (key === 'p' && (metaKey || ctrlKey)) {
      event.preventDefault?.();
      setSearching(true);
    }

    if (key === 'Escape') {
      setSearching(false);
    }
  }, []);

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
    <View ref={page} focusable enableFocusRing={false} style={styles.editor} onKeyDown={onKeyDown} keyDownEvents={KEY_DOWN_EVENTS}>

      <View style={styles.fileTree}>
        <FileTree currentFile={currentFile} onOpenFile={openFile} onSave={save} projectRoot={projectRoot} setProjectRoot={setProjectRoot} openedFiles={openedFiles} setOpenedFiles={setOpenedFiles} />
      </View>

      <View style={styles.codeEditorContainer}>
        {openedFiles.length > 0 && (
          <View style={styles.openedFiles}>
            {openedFiles.map(file => (
              <View key={file} style={[styles.openedFile, file === currentFile && styles.openedFileActive]}>
                <Text onPress={() => openFile(file)}>{file.split('/').pop()}</Text>
              </View>
            ))}
          </View>
        )}

        <CodeEditor
          value={source}
          path={currentFile}
          onChange={setSource}
          onSave={save}
          onSearch={() => setSearching(true)}
        />

        <View style={styles.terminal}>
          <Terminal projectRoot={projectRoot} onSearch={() => setSearching(true)} />
        </View>
      </View>

      {/* Last child, absolutely filled: it covers the tree and the editor
          both, and paints over them rather than taking a row of its own. */}
      {searching && (
        <SearchModal
          projectRoot={projectRoot}
          folder={null}
          onOpenFile={openSearchFile}
          onClose={() => setSearching(false)}
          itemsDeep={0}
        />
      )}
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
    ...glass(colors, {tint: 0.25}),
    borderRadius: 90,
    opacity: 0.75,
  },
  openedFileActive: {
    ...glass(colors, {tint: 1, tone: "primary"}),
    opacity: 1,
  },
  fileTree: {
    flex: 1,
  },
  terminal: {
    borderRadius: 16,
    height: 300,
    // The emulator inside draws to the edges, so the panel's own rounding has
    // to clip it — otherwise the scrollback runs out over the corners.
    overflow: 'hidden',
    ...glass(colors, {tint: 0.75})
  },
});
