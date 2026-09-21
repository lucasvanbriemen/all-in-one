import {COMMAND_LABELS, buildKeymap, commandForEvent, keyDownEventsFor} from './keymap';
import {FileSystemError, ServerUnavailableError, fileSystem} from '../fileSystem';
import {NativeModules, Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {ToastProvider, useToast} from './Toast';
import {activeFile, editorReducer, activeGroup as groupOf, initialEditorState, openPaths, serializeEditorState} from './editorState';
import {glass, useThemedStyles} from '../theme';
import {gutterChanges, lineDiff} from './lineDiff';

import {CommandPalette} from './CommandPalette';
import {EditorGroup} from './EditorGroup';
import {FileTree} from './FileTree';
import {SearchSidebar} from './SearchSidebar';
import {TerminalPanel} from './TerminalPanel';
import {Welcome} from './Welcome';
import {resolveVendorSources} from './vendor';
import {useAppContext} from '../../context/AppContext';
import {useFileTree} from './useFileTree';
import {useProjectEvents} from './useProjectEvents';
import {useServerHealth} from './useServerHealth';

const MAX_RECENT_PROJECTS = 8;
const MAX_RECENT_FILES = 30;
const SIDEBAR_WIDTH = 260;
const TERMINAL_HEIGHT = 260;
const AUTOSAVE_DELAY = 800;

export function CodePage() {
  return (
    <ToastProvider>
      <CodePageInner />
    </ToastProvider>
  );
}

/**
 * The Code page: a project's files, the editors open on them, a shell, and
 * the panels around them. This component owns the state the panels share and
 * the rules that tie them together — a file that changes on disk reloads in
 * its tab, a save refreshes the git gutter, a shortcut pressed in a WebView
 * lands here like any other.
 */
function CodePageInner() {
  const styles = useThemedStyles(createStyles);
  const toast = useToast();
  const {get, set} = useAppContext();
  const sidebarItem = get('app.activeSidebarItem');

  const health = useServerHealth();
  const [sources, setSources] = useState(null);

  // ---- Persisted state -----------------------------------------------------

  const [loadedState, setLoadedState] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [projectRoot, setProjectRoot] = useState(null);
  const projectsState = useRef({});

  // ---- Editor state ---------------------------------------------------------

  const [editor, dispatch] = useReducer(editorReducer, undefined, initialEditorState);
  const [buffers, setBuffers] = useState({});
  const buffersRef = useRef(buffers);
  buffersRef.current = buffers;
  const [closedTabs, setClosedTabs] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const editorRefs = useRef({});
  const saveTimers = useRef({});
  const pendingReveal = useRef(null);
  const [cursor, setCursor] = useState(null);
  const [saving, setSaving] = useState(false);

  // ---- Panels ---------------------------------------------------------------

  const [panel, setPanel] = useState('files');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const [palette, setPalette] = useState(null);
  const [searchSeed] = useState('');
  const [monacoActions, setMonacoActions] = useState([]);

  // ---- Git, diagnostics, terminals -----------------------------------------

  const [git, setGit] = useState(null);
  const [originals, setOriginals] = useState({});
  const [diff, setDiff] = useState(null);
  const [diagnostics, setDiagnostics] = useState({});
  const [terminals, setTerminals] = useState([]);
  const [activeTerminal, setActiveTerminal] = useState(null);
  const terminalCounter = useRef(0);

  const page = useRef(null);

  const markServerDown = health.markDown;

  const report = useCallback(
    (error, context) => {
      if (error instanceof ServerUnavailableError) {
        markServerDown();
        toast.show('The file server is not running.', {kind: 'error'});
        return;
      }

      const message = error instanceof FileSystemError ? error.message : error?.message ?? String(error);
      toast.show(context ? `${context}: ${message}` : message, {kind: 'error'});
    },
    [markServerDown, toast],
  );

  const tree = useFileTree(projectRoot, {onError: report});

  // ---- Boot: vendor sources, saved state ------------------------------------

  useEffect(() => {
    resolveVendorSources().then(setSources);
  }, []);

  useEffect(() => {
    fileSystem
      .getState()
      .then(state => {
        setLoadedState(state ?? {});
        setRecentProjects(state?.recentProjects ?? []);
        projectsState.current = state?.projects ?? {};

        if (state?.lastProject) {
          fileSystem
            .stat(state.lastProject, '')
            .then(() => openProject(state.lastProject, {restore: true}))
            .catch(() => {});
        }
      })
      .catch(error => {
        setLoadedState({});
        if (!(error instanceof ServerUnavailableError)) {
          report(error, 'Could not load saved state');
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Everything worth remembering, written a moment after it changes.
  useEffect(() => {
    if (!loadedState) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (projectRoot) {
        projectsState.current[projectRoot] = {
          editor: serializeEditorState(editor),
          recentFiles,
          panel,
          terminals: terminals.length,
        };
      }

      fileSystem
        .patchState({
          recentProjects,
          lastProject: projectRoot,
          projects: projectsState.current,
        })
        .catch(() => {});
    }, 600);

    return () => clearTimeout(timer);
  }, [loadedState, recentProjects, projectRoot, editor, recentFiles, panel, terminals.length]);

  // ---- Keyboard -------------------------------------------------------------

  const keymap = useMemo(() => buildKeymap(), []);
  const appKeys = useMemo(() => keyDownEventsFor(keymap), [keymap]);

  const activeEditor = useCallback(() => editorRefs.current[editor.activeGroup], [editor.activeGroup]);

  // ---- Buffers --------------------------------------------------------------

  const updateBuffer = useCallback((path, update) => {
    setBuffers(current => {
      const existing = current[path];
      const next = typeof update === 'function' ? update(existing) : {...existing, ...update};
      if (!next) {
        const {[path]: _, ...rest} = current;
        return rest;
      }
      return {...current, [path]: next};
    });
  }, []);

  const loadOriginal = useCallback(
    async (root, path) => {
      try {
        const response = await fileSystem.git.show(root, path);
        setOriginals(current => ({...current, [path]: response.contents ?? ''}));
      } catch (error) {
        // Not a repository, or the server is down; the gutter stays empty.
      }
    },
    [],
  );

  const loadBuffer = useCallback(
    async (root, path) => {
      const response = await fileSystem.readFile(root, path);
      const contents = response.contents ?? '';
      updateBuffer(path, {contents, disk: contents, mtime: response.mtime, dirty: false, conflict: false});
      return contents;
    },
    [updateBuffer],
  );

  const openFile = useCallback(
    async (path, {line, column, groupId, background = false} = {}) => {
      if (!projectRoot || !path) {
        return;
      }

      try {
        if (!buffersRef.current[path]) {
          await loadBuffer(projectRoot, path);
          if (git?.repository) {
            loadOriginal(projectRoot, path);
          }
        }
      } catch (error) {
        report(error, `Could not open ${path}`);
        return;
      }

      dispatch({type: 'open', path, groupId, background});
      setRecentFiles(current => [path, ...current.filter(entry => entry !== path)].slice(0, MAX_RECENT_FILES));
      setDiff(null);

      if (line) {
        pendingReveal.current = {path, line, column: column ?? 1, groupId: groupId ?? editor.activeGroup};
      }
    },
    [projectRoot, loadBuffer, loadOriginal, git, report, editor.activeGroup],
  );

  // The editor needs the file switched before it can jump; the pending jump
  // is applied once the group shows the file.
  useEffect(() => {
    const pending = pendingReveal.current;
    if (!pending) {
      return undefined;
    }

    const group = editor.groups.find(candidate => candidate.id === pending.groupId) ?? groupOf(editor);
    if (group?.active !== pending.path) {
      return undefined;
    }

    const timer = setTimeout(() => {
      editorRefs.current[group.id]?.revealPosition(pending.line, pending.column);
      pendingReveal.current = null;
    }, 120);

    return () => clearTimeout(timer);
  }, [editor, buffers]);

  const writeBuffer = useCallback(
    async (path, contents, {force = false} = {}) => {
      const buffer = buffersRef.current[path];

      if (!projectRoot || !buffer) {
        return;
      }

      if (!force && contents === buffer.disk) {
        return;
      }

      clearTimeout(saveTimers.current[path]);
      setSaving(true);

      try {
        const response = await fileSystem.writeFile(projectRoot, path, contents, force ? undefined : buffer.mtime);
        updateBuffer(path, current => ({...current, contents: current?.contents ?? contents, disk: contents, mtime: response.mtime, dirty: (current?.contents ?? contents) !== contents, conflict: false}));

        if (git?.repository) {
          refreshGit();
        }
      } catch (error) {
        if (error instanceof FileSystemError && error.status === 409) {
          updateBuffer(path, {conflict: true});
          toast.show(`${path} changed on disk. Reload it, or keep yours and overwrite.`, {
            kind: 'error',
            sticky: true,
            action: {label: 'Overwrite', onPress: () => writeBuffer(path, buffersRef.current[path]?.contents ?? contents, {force: true})},
          });
        } else {
          report(error, `Could not save ${path}`);
        }
      } finally {
        setSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectRoot, updateBuffer, git, report, toast],
  );

  const scheduleAutosave = useCallback(
    path => {
      clearTimeout(saveTimers.current[path]);

      saveTimers.current[path] = setTimeout(() => {
        const buffer = buffersRef.current[path];
        if (buffer && buffer.dirty && !buffer.conflict) {
          writeBuffer(path, buffer.contents);
        }
      }, AUTOSAVE_DELAY);
    },
    [writeBuffer],
  );

  const onEditorChange = useCallback(
    (value, path) => {
      if (!path) {
        return;
      }

      updateBuffer(path, current => (current ? {...current, contents: value, dirty: value !== current.disk} : current));
      scheduleAutosave(path);
    },
    [updateBuffer, scheduleAutosave],
  );

  const onEditorSave = useCallback(
    (value, path, blur) => {
      if (!path) {
        return;
      }

      updateBuffer(path, current => (current ? {...current, contents: value, dirty: value !== current.disk} : current));

      const buffer = buffersRef.current[path];
      if (buffer?.conflict) {
        return;
      }

      writeBuffer(path, value);
    },
    [updateBuffer, writeBuffer],
  );

  const saveActive = useCallback(() => {
    const path = activeFile(editor);
    if (!path) {
      return;
    }

    const ref = activeEditor();
    if (ref) {
      ref.requestSave(false);
    } else {
      writeBuffer(path, buffersRef.current[path]?.contents ?? '');
    }
  }, [editor, activeEditor, writeBuffer]);

  const saveAll = useCallback(() => {
    for (const [path, buffer] of Object.entries(buffersRef.current)) {
      if (buffer.dirty && !buffer.conflict) {
        writeBuffer(path, buffer.contents);
      }
    }
  }, [writeBuffer]);

  const resolveConflict = useCallback(
    async (path, choice) => {
      if (choice === 'reload') {
        try {
          await loadBuffer(projectRoot, path);
        } catch (error) {
          report(error, `Could not reload ${path}`);
        }
      } else {
        await writeBuffer(path, buffersRef.current[path]?.contents ?? '', {force: true});
      }
    },
    [projectRoot, loadBuffer, writeBuffer, report],
  );

  // ---- Project --------------------------------------------------------------

  const closeProject = useCallback(() => {
    for (const timer of Object.values(saveTimers.current)) {
      clearTimeout(timer);
    }
    saveTimers.current = {};
    setBuffers({});
    setOriginals({});
    setDiagnostics({});
    setDiff(null);
    setGit(null);
    setClosedTabs([]);
    setRecentFiles([]);
    setTerminals([]);
    setActiveTerminal(null);
    dispatch({type: 'restore', groups: []});
  }, []);

  const openProject = useCallback(
    async (root, {restore = true} = {}) => {
      if (!root) {
        return;
      }

      closeProject();
      setProjectRoot(root);
      setRecentProjects(current => [root, ...current.filter(entry => entry !== root)].slice(0, MAX_RECENT_PROJECTS));

      const saved = projectsState.current[root];

      const wanted = Math.max(1, Math.min(4, saved?.terminals ?? 1));
      const list = Array.from({length: wanted}, () => ({id: ++terminalCounter.current}));
      setTerminals(list);
      setActiveTerminal(list[0].id);

      if (restore && saved?.editor?.groups?.length) {
        const paths = [...new Set(saved.editor.groups.flatMap(group => group.tabs ?? []))];
        const loaded = await Promise.all(
          paths.map(path =>
            fileSystem
              .readFile(root, path)
              .then(response => [path, response])
              .catch(() => null),
          ),
        );

        const okPaths = new Set();
        setBuffers(() => {
          const next = {};
          for (const entry of loaded) {
            if (!entry) {
              continue;
            }
            const [path, response] = entry;
            const contents = response.contents ?? '';
            next[path] = {contents, disk: contents, mtime: response.mtime, dirty: false, conflict: false};
            okPaths.add(path);
          }
          return next;
        });

        dispatch({
          type: 'restore',
          groups: saved.editor.groups.map(group => ({
            tabs: (group.tabs ?? []).filter(path => okPaths.has(path)),
            active: okPaths.has(group.active) ? group.active : null,
          })),
          activeIndex: saved.editor.activeIndex ?? 0,
        });
        setRecentFiles(saved.recentFiles ?? []);
      }
    },
    [closeProject],
  );

  const pickFolder = useCallback(async () => {
    const picker = NativeModules.FolderPicker;

    if (!picker?.pick) {
      toast.show('Opening a folder is only available on macOS.', {kind: 'info'});
      return;
    }

    try {
      const path = await picker.pick();
      if (path) {
        await openProject(path, {restore: true});
      }
    } catch (error) {
      report(error, 'Could not open folder');
    }
  }, [openProject, report, toast]);

  // ---- Git --------------------------------------------------------------------

  const gitTimer = useRef(null);

  const refreshGit = useCallback(() => {
    if (!projectRoot) {
      return Promise.resolve();
    }

    clearTimeout(gitTimer.current);

    return new Promise(resolve => {
      gitTimer.current = setTimeout(async () => {
        try {
          const status = await fileSystem.git.status(projectRoot);
          setGit(status);

          if (status.repository) {
            for (const path of openPaths(editor)) {
              loadOriginal(projectRoot, path);
            }
          }
        } catch (error) {
          if (error instanceof ServerUnavailableError) {
            markServerDown();
          }
        } finally {
          resolve();
        }
      }, 150);
    });
  }, [projectRoot, editor, loadOriginal, markServerDown]);

  useEffect(() => {
    if (projectRoot) {
      refreshGit();
    }
    // Only when the project changes; saves and events refresh on their own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectRoot]);

  const gitByPath = useMemo(() => {
    const map = {};
    for (const change of git?.changes ?? []) {
      map[change.path] = change;
    }
    return map;
  }, [git]);

  const showDiff = useCallback(
    async (path, {staged = false} = {}) => {
      await openFile(path);

      try {
        const response = await fileSystem.git.show(projectRoot, path);
        setDiff({path, staged, original: response.contents ?? ''});
      } catch (error) {
        report(error, 'Could not load the committed version');
      }
    },
    [openFile, projectRoot, report],
  );

  // ---- File changes from outside ---------------------------------------------

  const onProjectChanges = useCallback(
    changes => {
      tree.applyChanges(changes.filter(change => change.kind !== 'git'));

      let gitTouched = changes.some(change => change.kind === 'git');

      for (const change of changes) {
        if (change.kind === 'git') {
          continue;
        }

        gitTouched = true;
        const buffer = buffersRef.current[change.path];

        if (!buffer) {
          continue;
        }

        if (change.kind === 'delete') {
          if (buffer.dirty) {
            updateBuffer(change.path, {conflict: true, mtime: null});
            toast.show(`${change.path} was deleted on disk. Saving will recreate it.`, {kind: 'info'});
          } else {
            dispatch({type: 'closeEverywhere', path: change.path});
            updateBuffer(change.path, () => null);
            toast.show(`${change.path} was deleted on disk.`, {kind: 'info'});
          }
          continue;
        }

        fileSystem
          .readFile(projectRoot, change.path)
          .then(response => {
            const contents = response.contents ?? '';
            const current = buffersRef.current[change.path];

            if (!current || contents === current.disk) {
              if (current) {
                updateBuffer(change.path, {mtime: response.mtime});
              }
              return;
            }

            if (!current.dirty) {
              updateBuffer(change.path, {contents, disk: contents, mtime: response.mtime, dirty: false, conflict: false});
            } else {
              updateBuffer(change.path, {disk: contents, mtime: response.mtime, conflict: true, dirty: true});
            }
          })
          .catch(() => {});
      }

      if (gitTouched && projectRoot) {
        refreshGit();
      }
    },
    [tree, updateBuffer, toast, projectRoot, refreshGit],
  );

  useProjectEvents(projectRoot, onProjectChanges, {enabled: health.up !== false});

  // ---- Tree actions ------------------------------------------------------------

  const createFile = useCallback(
    async path => {
      try {
        await fileSystem.createFile(projectRoot, path, '');
        await openFile(path);
      } catch (error) {
        report(error, `Could not create ${path}`);
      }
    },
    [projectRoot, openFile, report],
  );

  const createFolder = useCallback(
    async path => {
      try {
        await fileSystem.createDirectory(projectRoot, path);
        tree.expand(path);
      } catch (error) {
        report(error, `Could not create ${path}`);
      }
    },
    [projectRoot, tree, report],
  );

  const renamePath = useCallback(
    async (from, to, isDirectory) => {
      try {
        // A pending write must land under the old name, or not at all.
        const buffer = buffersRef.current[from];
        if (buffer?.dirty) {
          await writeBuffer(from, buffer.contents);
        }

        await fileSystem.rename(projectRoot, from, to);

        if (isDirectory) {
          dispatch({type: 'renameFolder', from, to});
          setBuffers(current => {
            const next = {};
            for (const [path, value] of Object.entries(current)) {
              const moved = path === from || path.startsWith(`${from}/`) ? to + path.slice(from.length) : path;
              next[moved] = value;
            }
            return next;
          });
        } else {
          dispatch({type: 'rename', from, to});
          setBuffers(current => {
            if (!current[from]) {
              return current;
            }
            const {[from]: moved, ...rest} = current;
            return {...rest, [to]: moved};
          });
        }
      } catch (error) {
        report(error, `Could not rename ${from}`);
      }
    },
    [projectRoot, writeBuffer, report],
  );

  const deletePath = useCallback(
    async (path, isDirectory) => {
      try {
        await fileSystem.deletePath(projectRoot, path);

        const affected = Object.keys(buffersRef.current).filter(entry => entry === path || (isDirectory && entry.startsWith(`${path}/`)));
        for (const entry of affected) {
          clearTimeout(saveTimers.current[entry]);
          dispatch({type: 'closeEverywhere', path: entry});
          updateBuffer(entry, () => null);
        }

        toast.show(`Deleted ${path}`, {kind: 'success'});
      } catch (error) {
        report(error, `Could not delete ${path}`);
      }
    },
    [projectRoot, updateBuffer, toast, report],
  );

  // ---- Tabs -----------------------------------------------------------------------

  const closeTab = useCallback(
    (path, groupId) => {
      const buffer = buffersRef.current[path];
      if (buffer?.dirty && !buffer.conflict) {
        writeBuffer(path, buffer.contents);
      }

      dispatch({type: 'close', path, groupId});
      setClosedTabs(current => [path, ...current.filter(entry => entry !== path)].slice(0, 20));

      if (diff?.path === path) {
        setDiff(null);
      }
    },
    [writeBuffer, diff],
  );

  // A buffer nobody shows any more is dropped, so a file reopened later is
  // read fresh. Dirty ones stay until they are saved.
  useEffect(() => {
    const open = new Set(openPaths(editor));
    setBuffers(current => {
      let changed = false;
      const next = {};
      for (const [path, buffer] of Object.entries(current)) {
        if (open.has(path) || buffer.dirty) {
          next[path] = buffer;
        } else {
          changed = true;
        }
      }
      return changed ? next : current;
    });
    setDiagnostics(current => {
      const next = {};
      let changed = false;
      for (const [path, list] of Object.entries(current)) {
        if (open.has(path)) {
          next[path] = list;
        } else {
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [editor]);

  // ---- Commands --------------------------------------------------------------------

  const showPanel = useCallback(
    id => {
      setPanel(id);
      setShowSidebar(true);
      if (id === 'files' || id === 'search') {
        set('app.activeSidebarItem', id);
      }
    },
    [set],
  );

  useEffect(() => {
    if ((sidebarItem === 'files' || sidebarItem === 'search') && sidebarItem !== panel) {
      setPanel(sidebarItem);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarItem]);

  const addTerminal = useCallback(() => {
    const id = ++terminalCounter.current;
    setTerminals(current => [...current, {id}]);
    setActiveTerminal(id);
    setShowTerminal(true);
  }, []);

  const closeTerminal = useCallback(
    id => {
      setTerminals(current => {
        const next = current.filter(terminal => terminal.id !== id);
        setActiveTerminal(active => (active === id ? next[next.length - 1]?.id ?? null : active));
        return next;
      });
    },
    [],
  );

  const commands = useMemo(() => {
    const binding = id => keymap.find(entry => entry.command === id)?.text;
    const define = (id, run, {label = COMMAND_LABELS[id] ?? id, category = null} = {}) => ({id, label, category, keybinding: binding(id), run});

    const list = [
      define('quickOpen', () => setPalette({mode: 'files'}), {category: 'Go'}),
      define('commandPalette', () => setPalette({mode: 'commands'}), {category: 'View'}),
      define('goToSymbol', () => activeEditor()?.runAction('editor.action.quickOutline'), {category: 'Go'}),
      define('goToLine', () => setPalette({mode: 'line'}), {category: 'Go'}),
      define('save', saveActive, {category: 'File'}),
      define('saveAll', saveAll, {category: 'File'}),
      define('closeTab', () => {
        const path = activeFile(editor);
        if (path) {
          closeTab(path, editor.activeGroup);
        }
      }, {category: 'View'}),
      define('closeAllTabs', () => dispatch({type: 'closeAll'}), {category: 'View'}),
      define('reopenClosedTab', () => {
        const [path, ...rest] = closedTabs;
        if (path) {
          setClosedTabs(rest);
          openFile(path);
        }
      }, {category: 'View'}),
      define('nextTab', () => dispatch({type: 'next'}), {category: 'View'}),
      define('previousTab', () => dispatch({type: 'previous'}), {category: 'View'}),
      define('nextTabAlt', () => dispatch({type: 'next'}), {category: 'View'}),
      define('previousTabAlt', () => dispatch({type: 'previous'}), {category: 'View'}),
      define('splitEditor', () => dispatch({type: editor.groups.length > 1 ? 'unsplit' : 'split'}), {
        category: 'View',
        label: editor.groups.length > 1 ? 'Join editors' : 'Split editor',
      }),
      define('focusFirstGroup', () => editor.groups[0] && dispatch({type: 'activateGroup', groupId: editor.groups[0].id}), {category: 'View'}),
      define('focusSecondGroup', () => editor.groups[1] && dispatch({type: 'activateGroup', groupId: editor.groups[1].id}), {category: 'View'}),
      define('toggleSidebar', () => setShowSidebar(current => !current), {category: 'View'}),
      define('toggleTerminal', () => {
        if (!showTerminal && terminals.length === 0) {
          addTerminal();
        }
        setShowTerminal(current => !current);
      }, {category: 'View'}),
      define('newTerminal', addTerminal, {category: 'Terminal'}),
      define('showFiles', () => showPanel('files'), {category: 'View'}),
      define('showSearch', () => showPanel('search'), {category: 'View'}),
      define('showGit', () => showPanel('git'), {category: 'View'}),
      define('showProblems', () => showPanel('problems'), {category: 'View'}),
      define('openFolder', pickFolder, {category: 'File'}),
      define('newFile', () => {
        showPanel('files');
        toast.show('Use the ＋ in the file tree to name the new file.', {kind: 'info'});
      }, {category: 'File'}),
      define('formatDocument', () => activeEditor()?.runAction('editor.action.formatDocument'), {category: 'Editor'}),
      define('dismiss', () => {
        setPalette(null);
        setDiff(null);
        page.current?.focus?.();
      }, {category: 'View'}),
      {id: 'closeProject', label: 'Close folder', category: 'File', run: () => { closeProject(); setProjectRoot(null); }},
      {id: 'refreshGit', label: 'Refresh git status', category: 'Git', run: refreshGit},
      {id: 'stageAll', label: 'Stage all changes', category: 'Git', run: () => fileSystem.git.stage(projectRoot, 'all').then(refreshGit).catch(report)},
      {id: 'revealInTree', label: 'Reveal active file in tree', category: 'View', run: () => { const path = activeFile(editor); if (path) { showPanel('files'); tree.reveal(path); } }},
      {id: 'showDiff', label: 'Compare active file with HEAD', category: 'Git', run: () => { const path = activeFile(editor); if (path) { showDiff(path); } }},
      {id: 'reloadEditor', label: 'Reload editor view', category: 'Developer', run: () => activeEditor()?.reload()},
    ];

    for (const action of monacoActions) {
      list.push({id: `monaco:${action.id}`, label: action.label, category: 'Editor', run: () => activeEditor()?.runAction(action.id)});
    }

    return list;
  }, [keymap, editor, closedTabs, terminals.length, showTerminal, monacoActions, projectRoot, activeEditor, saveActive, saveAll, closeTab, openFile, addTerminal, showPanel, pickFolder, closeProject, refreshGit, report, toast, tree, showDiff]);

  const runCommand = useCallback(
    id => {
      const command = commands.find(entry => entry.id === id);
      command?.run?.();
    },
    [commands],
  );

  // A key from the page, from Monaco, from xterm or from the document: one
  // handler. A palette that is open takes Escape itself; the rest is the keymap.
  const onKeyDown = useCallback(
    event => {
      const command = commandForEvent(keymap, event);

      if (!command) {
        return;
      }

      event.preventDefault?.();

      if (command === 'dismiss' && !palette && !diff) {
        return;
      }

      runCommand(command);
    },
    [keymap, palette, diff, runCommand],
  );

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  // Nothing in this tree takes focus on its own, and on macOS key events are
  // only emitted from the first responder — a plain View never becomes one, and
  // clicks deliberately don't move focus. Without this the shortcut only works
  // while Monaco holds focus, because Monaco is the only thing here that does.
  useEffect(() => {
    if (!palette) {
      page.current?.focus?.();
    }
  }, [palette]);

  // Monaco's actions join the palette the first time it opens on commands.
  useEffect(() => {
    if (palette?.mode === 'commands' && monacoActions.length === 0) {
      activeEditor()?.listActions?.().then(actions => setMonacoActions(actions ?? []));
    }
  }, [palette, monacoActions.length, activeEditor]);

  // ---- Derived --------------------------------------------------------------------

  const dirtyPaths = useMemo(() => new Set(Object.entries(buffers).filter(([, buffer]) => buffer.dirty).map(([path]) => path)), [buffers]);

  const problemsByPath = useMemo(() => {
    const map = {};
    for (const [path, list] of Object.entries(diagnostics)) {
      map[path] = {
        errors: list.filter(problem => problem.severity === 'error').length,
        warnings: list.filter(problem => problem.severity === 'warning').length,
      };
    }
    return map;
  }, [diagnostics]);

  const gutterByGroup = useMemo(() => {
    const map = {};
    for (const group of editor.groups) {
      const path = group.active;
      if (!path || originals[path] === undefined || !buffers[path]) {
        map[group.id] = [];
        continue;
      }
      map[group.id] = gutterChanges(lineDiff(originals[path], buffers[path].contents));
    }
    return map;
  }, [editor.groups, originals, buffers]);

  const activePath = activeFile(editor);

  return (
    <View
      ref={page}
      focusable
      enableFocusRing={false}
      style={styles.page}
      onKeyDown={onKeyDown}
      keyDownEvents={appKeys}
      testID="code-page">
      {health.up === false && (
        <View style={styles.serverBanner} testID="server-banner">
          <Text style={styles.serverBannerText}>The file server is not running. Files, search, git and the terminal are unavailable until it is back.</Text>
          <Pressable onPress={health.refresh} style={styles.serverRetry}>
            <Text style={styles.serverRetryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.body}>
        {showSidebar && (
          <>
            <View style={[styles.sidebar, {width: SIDEBAR_WIDTH}]} testID="sidebar">
              {panel === 'files' && (
                <FileTree
                  projectRoot={projectRoot}
                  tree={tree}
                  currentFile={activePath}
                  openFiles={openPaths(editor)}
                  dirtyPaths={dirtyPaths}
                  gitByPath={gitByPath}
                  onOpenFile={path => openFile(path)}
                  onOpenFolder={pickFolder}
                  onCreateFile={createFile}
                  onCreateFolder={createFolder}
                  onRename={renamePath}
                  onDelete={deletePath}
                  onCollapseAll={() => {
                    for (const path of tree.expanded) {
                      tree.toggle(path);
                    }
                  }}
                />
              )}

              {panel === 'search' && (
                <SearchSidebar
                  projectRoot={projectRoot}
                  initialTerm={searchSeed}
                  onOpenFile={(path, line, column) => openFile(path, {line, column})}
                  onReplaced={outcome => toast.show(`Replaced ${outcome.replacements} occurrence${outcome.replacements === 1 ? '' : 's'} in ${outcome.changed.length} file${outcome.changed.length === 1 ? '' : 's'}.`, {kind: 'success'})}
                  onError={report}
                />
              )}
            </View>
          </>
        )}

        <View style={styles.main}>
          {!projectRoot && (
            <Welcome
              recentProjects={recentProjects}
              onOpenFolder={pickFolder}
              onOpenRecent={path => openProject(path, {restore: true})}
              onForgetRecent={path => setRecentProjects(current => current.filter(entry => entry !== path))}
              serverUp={health.up}
              keybindings={{openFolder: commands.find(command => command.id === 'openFolder')?.keybinding}}
            />
          )}

          {projectRoot && sources && (
            <View style={styles.groups} testID="editor-groups">
              {editor.groups.map((group, index) => (
                <React.Fragment key={group.id}>
                  {index > 0 && <View style={styles.groupGap} />}
                  <EditorGroup
                    group={group}
                    isActive={group.id === editor.activeGroup}
                    canSplit={editor.groups.length < 2}
                    hasOtherGroup={editor.groups.length > 1}
                    buffers={buffers}
                    dirtyPaths={dirtyPaths}
                    gitByPath={gitByPath}
                    problemsByPath={problemsByPath}
                    gutterChanges={gutterByGroup[group.id]}
                    diff={diff && diff.path === group.active ? diff : null}
                    conflict={Boolean(group.active && buffers[group.active]?.conflict)}
                    appKeys={appKeys}
                    sources={sources}
                    projectRoot={projectRoot}
                    editorRef={instance => {
                      editorRefs.current[group.id] = instance;
                    }}
                    onActivateGroup={groupId => dispatch({type: 'activateGroup', groupId})}
                    onActivateTab={(path, groupId) => dispatch({type: 'activate', path, groupId})}
                    onCloseTab={closeTab}
                    onCloseOthers={(path, groupId) => dispatch({type: 'closeOthers', path, groupId})}
                    onCloseAll={groupId => dispatch({type: 'closeAll', groupId})}
                    onMoveTab={(path, to, groupId) => dispatch({type: 'move', path, to, groupId})}
                    onSplit={() => dispatch({type: 'split'})}
                    onMoveToOtherGroup={path => {
                      const other = editor.groups.find(candidate => candidate.id !== group.id);
                      if (other) {
                        dispatch({type: 'moveToGroup', path, groupId: other.id});
                      }
                    }}
                    onCloseGroup={() => dispatch({type: 'unsplit'})}
                    onChange={onEditorChange}
                    onSave={onEditorSave}
                    onCommand={onKeyDown}
                    onOpenFile={({path, line, column}) => openFile(path, {line, column, groupId: group.id})}
                    onCursor={position => {
                      if (group.id === editor.activeGroup) {
                        setCursor(position);
                      }
                    }}
                    onDiagnostics={({path, diagnostics: list}) => setDiagnostics(current => ({...current, [path]: list}))}
                    onLoadError={() => toast.show('The editor could not load. Check the network, or start the file server for the offline copy.', {kind: 'error'})}
                    onCloseDiff={() => setDiff(null)}
                    onResolveConflict={resolveConflict}
                  />
                </React.Fragment>
              ))}
            </View>
          )}

          {projectRoot && !sources && (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>Loading editor…</Text>
            </View>
          )}

          {projectRoot && showTerminal && terminals.length > 0 && sources && (
            <>
              <TerminalPanel
                style={{height: TERMINAL_HEIGHT}}
                projectRoot={projectRoot}
                terminals={terminals}
                activeId={activeTerminal}
                onActivate={setActiveTerminal}
                onAdd={addTerminal}
                onClose={closeTerminal}
                onCollapse={() => setShowTerminal(false)}
                appKeys={appKeys}
                sources={sources}
                serverUp={health.up !== false}
                onCommand={onKeyDown}
              />
            </>
          )}
        </View>
      </View>

      <CommandPalette
        visible={Boolean(palette)}
        initialMode={palette?.mode}
        projectRoot={projectRoot}
        commands={commands}
        recentFiles={recentFiles}
        onClose={() => setPalette(null)}
        onOpenFile={path => openFile(path)}
        onGoToLine={line => activeEditor()?.revealPosition(line, 1)}
        onGoToSymbol={() => activeEditor()?.runAction('editor.action.quickOutline')}
      />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  page: {
    flex: 1,
    position: 'relative',
  },
  serverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderColor: '#f85149',
    ...glass(colors, {variant: 'tinted'}),
  },
  serverBannerText: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 12.5,
  },
  serverRetry: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    ...glass(colors, {variant: 'accent'}),
  },
  serverRetryText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  main: {
    flex: 1,
    minWidth: 0,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 10,
  },
  groups: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  groupGap: {
    width: 10,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
  },
});
