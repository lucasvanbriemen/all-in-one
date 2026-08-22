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
  const [projectRoot, setProjectRoot] = useState(null);

  const save = useCallback(
    async (contents = source) => {
      if (!currentFile) {
        return;
      }

      await fileSystem.writeFile(projectRoot, currentFile, contents);
    },
    [currentFile, source],
  );

  const openFile = useCallback(
    async path => {
      // The outgoing file first — the debounce below may still be pending, and
      // it is cancelled the moment `currentFile` changes.
      await save();

      const response = await fileSystem.readFile(projectRoot, path);
      const contents = response.contents ?? '';

      setSource(contents);
      setCurrentFile(path);
    },
    [save, projectRoot],
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

  return (
    <View style={styles.editor}>
      <View style={styles.fileTree}>
        <FileTree currentFile={currentFile} onOpenFile={openFile} onSave={save} projectRoot={projectRoot} setProjectRoot={setProjectRoot} />
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
