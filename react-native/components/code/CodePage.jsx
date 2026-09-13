import {useScrollLayout} from '../ScrollLayout';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { glass, useThemedStyles } from '../theme';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useCompactLayout } from '../useCompactLayout';

import { CodeEditor } from '../CodeEditor';
import { FileTree } from './FileTree';
import { SearchSidebar } from './SearchSidebar';
import { Terminal } from './Terminal';
import { fileSystem } from '../fileSystem';

const AUTO_SAVE_DELAY = 800;

// Listing a key here does not decide whether JS sees it — every key on the
// first responder is emitted and bubbles as `onKeyDown` regardless. What this
// does is claim the key so macOS stops handling it itself, which is what keeps
// Cmd+P off the print dialog and Escape from beeping.
const KEY_DOWN_EVENTS = [{ key: 'p', metaKey: true }, { key: 'Escape' }];

export function CodePage({ activeSidebarItem }) {
  const scrollLayout = useScrollLayout();
  const compact = useCompactLayout();
  const [showTerminal, setShowTerminal] = useState(false);
  const [showFiles, setShowFiles] = useState(true);
  const styles = useThemedStyles(createStyles);
  const [source, setSource] = useState('// some comment\n');
  const [currentFile, setCurrentFile] = useState(null);
  const [openedFiles, setOpenedFiles] = useState([]);
  const [projectRoot, setProjectRoot] = useState(null);
  const [searching, setSearching] = useState(false);
  const page = useRef(null);

  useEffect(() => {
    setShowFiles(true);
  }, [activeSidebarItem]);

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

      setShowFiles(false);
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
    const { key, metaKey, ctrlKey } = event.nativeEvent ?? event;

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
    <View
      ref={page}
      focusable
      enableFocusRing={false}
      style={[styles.editor, compact && styles.compactEditor, scrollLayout.contentContainerStyle]}
      onKeyDown={onKeyDown}
      keyDownEvents={KEY_DOWN_EVENTS}
    >
      {compact && (
        <View style={styles.mobileTools}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowFiles(value => !value)}
            style={styles.mobileTool}
          >
            <Text style={styles.toolText}>
              {showFiles ? 'Hide browser' : 'Show browser'}
            </Text>
          </Pressable>
          {projectRoot && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowTerminal(value => !value)}
              style={styles.mobileTool}
            >
              <Text style={styles.toolText}>
                {showTerminal ? 'Hide terminal' : 'Show terminal'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      {activeSidebarItem == 'files' && (
        <View
          style={[
            styles.fileTree,
            compact && styles.compactTree,
            compact && !showFiles && styles.hidden,
          ]}
        >
          <FileTree
            currentFile={currentFile}
            onOpenFile={openFile}
            onSave={save}
            projectRoot={projectRoot}
            setProjectRoot={setProjectRoot}
            openedFiles={openedFiles}
            setOpenedFiles={setOpenedFiles}
          />
        </View>
      )}

      {activeSidebarItem == 'search' && (
        <View
          style={[
            styles.fileTree,
            compact && styles.compactTree,
            compact && !showFiles && styles.hidden,
          ]}
        >
          <SearchSidebar onOpenFile={openFile} projectRoot={projectRoot} />
        </View>
      )}

      <View style={styles.codeEditorContainer}>
        {openedFiles.length > 0 && (
          <ScrollView
            horizontal
            style={styles.tabScroll}
            contentContainerStyle={styles.openedFiles}
          >
            {openedFiles.map(file => (
              <View
                key={file}
                style={[
                  styles.openedFile,
                  file === currentFile && styles.openedFileActive,
                ]}
              >
                <Text
                  onPress={() => openFile(file)}
                  style={[
                    styles.openedFileText,
                    file === currentFile && styles.openedFileActiveText,
                  ]}
                >
                  {file.split('/').pop()}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {projectRoot && (
          <>
            <CodeEditor
              value={source}
              path={currentFile}
              onChange={setSource}
              onSave={save}
              onSearch={() => setSearching(true)}
            />

            <View
              style={[
                styles.terminal,
                compact && styles.compactTerminal,
                compact && !showTerminal && styles.hidden,
              ]}
            >
              <Terminal
                projectRoot={projectRoot}
                onSearch={() => setSearching(true)}
              />
            </View>
          </>
        )}

        {!projectRoot && (
          <View style={styles.noProjectRoot}>
            <Text style={styles.noProjectRootText}>No project opened</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    compactEditor: { flexDirection: 'column', gap: 0 },
    compactTree: { flex: 0, height: 200, maxHeight: '35%' },
    compactTerminal: { height: 140 },
    hidden: { display: 'none' },
    mobileTools: { flexDirection: 'row', gap: 16 },
    mobileTool: { minHeight: 44, justifyContent: 'center' },
    toolText: { color: colors.primary },
    tabScroll: { flexGrow: 0, flexShrink: 0 },
    editor: {
      flexDirection: 'row',
      position: 'relative',
      gap: 16,
      flex: 1,
    },
    codeEditorContainer: {
      minHeight: 0,
      minWidth: 0,
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
      ...glass(colors, { variant: 'subtle' }),
      borderRadius: 90,
      opacity: 0.75,
    },
    openedFileActive: {
      ...glass(colors, { variant: 'accent' }),
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
      ...glass(colors, { variant: 'subtle' }),
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
