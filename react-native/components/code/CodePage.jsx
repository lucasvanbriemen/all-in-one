import {StyleSheet, View} from 'react-native';
import {useCallback, useEffect, useRef, useState} from 'react';

import {CodeEditor} from '../CodeEditor';
import {FileTree} from './FileTree';
import {fileSystem} from '../fileSystem';
import {useThemedStyles} from '../theme';

/** How long the buffer has to sit still before it is written on its own. */
const AUTO_SAVE_DELAY = 800;

export function CodePage({selection, onSelect}) {
  const styles = useThemedStyles(createStyles);
  const [source, setSource] = useState('// some comment\n');
  const [currentFile, setCurrentFile] = useState(null);

  // What the file on disk is known to hold. Every write is measured against
  // it, so opening a file — or blurring one nobody typed in — costs no PUT.
  const saved = useRef(null);

  // Takes the contents rather than reading `source`, because the editor hands
  // its own buffer over with the save: on the keystroke that triggers Cmd+S,
  // Monaco is a render ahead of the state.
  const save = useCallback(
    async (contents = source) => {
      if (!currentFile || contents === saved.current) {
        return;
      }

      try {
        await fileSystem.writeFile(currentFile, contents);
        saved.current = contents;
      } catch (error) {
        console.warn(`could not save ${currentFile}: ${error.message}`);
      }
    },
    [currentFile, source],
  );

  const openFile = useCallback(
    async path => {
      // The outgoing file first — the debounce below may still be pending, and
      // it is cancelled the moment `currentFile` changes.
      await save();

      const response = await fileSystem.readFile(path);
      const contents = response.contents ?? '';

      saved.current = contents;
      setSource(contents);
      setCurrentFile(path);
    },
    [save],
  );

  // The buffer is written once it stops moving. Clearing the timer on every
  // change is also what makes switching files safe: a write scheduled against
  // one path can never land on the next one.
  useEffect(() => {
    if (!currentFile || source === saved.current) {
      return;
    }

    const timer = setTimeout(() => save(source), AUTO_SAVE_DELAY);

    return () => clearTimeout(timer);
  }, [currentFile, source, save]);

  return (
    <View style={styles.editor}>
      <View style={styles.fileTree}>
        <FileTree currentFile={currentFile} onOpenFile={openFile} onSave={save} />
      </View>

      <View style={styles.codeEditorContainer}>
        <CodeEditor
          value={source}
          path={currentFile}
          onChange={setSource}
          onSave={save}
        />
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  editor: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  codeEditorContainer: {
    flex: 5,
    backgroundColor: colors.surface,
    marginBottom: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
  },
  fileTree: {
    flex: 1,
  },
});
