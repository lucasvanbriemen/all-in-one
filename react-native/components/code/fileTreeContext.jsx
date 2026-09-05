import {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';

import {fileSystem} from '../fileSystem';
import {sortFiles} from './sortFiles';

/**
 * The tree used to keep its rows where it found them: `FileTree` held the top
 * level and every `FileNode` held its own children, which is enough to browse
 * with and not enough to edit with. A rename has to redraw the folder it
 * happened in, and nothing could reach into a node from outside to say so.
 *
 * So the shape of the tree lives here instead, keyed by directory path — `''`
 * is the project root — and the rows became a projection of it. Editing is
 * then only ever "change the disk, reload the directories that moved".
 */
const FileTreeContext = createContext(null);

export function useFileTree() {
  return useContext(FileTreeContext);
}

export function parentOf(entryPath) {
  const cut = entryPath.lastIndexOf('/');

  return cut === -1 ? '' : entryPath.slice(0, cut);
}

export function joinPath(directoryPath, name) {
  return directoryPath ? `${directoryPath}/${name}` : name;
}

/**
 * What the inline field will not let you commit. Anything the server would
 * also refuse is checked there too — this is only about telling the user
 * before the round trip, the way VS Code's explorer does.
 *
 * A separator is deliberately *not* rejected: typing `models/user.rb` into the
 * new-file field is meant to create the folder on the way, so the rules are
 * about the segments rather than the string.
 */
function validateName(name, siblings, ignoredPath) {
  const trimmed = name.trim();

  if (!trimmed) {
    return 'A name is required';
  }

  const segments = trimmed.split('/');

  if (segments.some(segment => segment === '' || segment === '.' || segment === '..')) {
    return 'That is not a valid path';
  }

  const taken = siblings.some(
    entry => entry.name.toLowerCase() === segments[0].toLowerCase() && entry.fullPath !== ignoredPath,
  );

  if (taken && segments.length === 1) {
    return `${segments[0]} already exists here`;
  }

  return null;
}

export function FileTreeProvider({projectRoot, currentFile, onOpenFile, onEntryRenamed, onEntryRemoved, children}) {
  // Directory path -> its sorted contents. A key being absent means "never
  // looked at"; an empty array means "looked at, and it is empty".
  const [entries, setEntries] = useState({});
  const [expanded, setExpanded] = useState({});

  // The one inline field the tree can have open: either a new entry being
  // named inside `parentPath`, or `targetPath` being renamed. Only one at a
  // time, because there is only one keyboard.
  const [draft, setDraft] = useState(null);
  const [menu, setMenu] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  // The row the keyboard is talking about. Clicking a row selects it as well
  // as opening it, which is what gives Return and Delete something to act on
  // without the tree having to make every row separately focusable.
  const [selected, setSelected] = useState(null);

  // What Cmd+C or Cmd+X put aside, and which of the two it was. A cut is only
  // carried out on paste, so until then nothing has moved and the entry is
  // still where it was — only shown faded, to say it is on its way out.
  const [clipboard, setClipboard] = useState(null);

  // Where a failed rename or delete would have shown its complaint, there is a
  // field to put it in. Copy, paste and delete have no field, so they need
  // somewhere of their own rather than failing in silence.
  const [problem, setProblem] = useState(null);

  // The panel itself. On macOS keys are only delivered to the first responder,
  // and a click deliberately does not move focus, so the rows have to hand it
  // back here explicitly or the shortcuts would only work by accident.
  const tree = useRef(null);

  const load = useCallback(
    async directoryPath => {
      if (!projectRoot) {
        return;
      }

      const response = await fileSystem.listFiles(projectRoot, directoryPath);

      setEntries(current => ({...current, [directoryPath]: sortFiles(response.contents ?? [])}));
    },
    [projectRoot],
  );

  // A new project shares nothing with the last one — not the rows, not which
  // folders were open, and certainly not a half-typed name.
  useEffect(() => {
    setEntries({});
    setExpanded({});
    setDraft(null);
    setMenu(null);
    setPendingDelete(null);
    setSelected(null);
    setClipboard(null);
    setProblem(null);
    load('');
  }, [projectRoot, load]);

  /**
   * Renaming or deleting a folder invalidates everything cached beneath it,
   * and those rows would otherwise sit there addressing paths that no longer
   * exist. Dropping the subtree is cheaper than rewriting it, and the folder
   * is reloaded from disk the next time it is opened anyway.
   */
  const forgetSubtree = useCallback(directoryPath => {
    const prefix = `${directoryPath}/`;
    const isBeneath = key => key === directoryPath || key.startsWith(prefix);
    const without = record => Object.fromEntries(Object.entries(record).filter(([key]) => !isBeneath(key)));

    setEntries(without);
    setExpanded(without);
  }, []);

  /**
   * Opens every folder on the way to a path and loads them, so something just
   * created is visible where it landed rather than behind a closed folder —
   * which is the whole point of letting the name carry a folder in it.
   */
  const reveal = useCallback(
    async (entryPath, expandSelf) => {
      const segments = entryPath.split('/');
      const directories = [''];

      for (let index = 0; index < segments.length - 1; index++) {
        directories.push(joinPath(directories[index], segments[index]));
      }

      if (expandSelf) {
        directories.push(entryPath);
      }

      setExpanded(current => ({...current, ...Object.fromEntries(directories.map(directory => [directory, true]))}));

      await Promise.all(directories.map(load));
    },
    [load],
  );

  const toggleDirectory = useCallback(
    directoryPath => {
      const isOpen = expanded[directoryPath];

      setExpanded(current => ({...current, [directoryPath]: !isOpen}));

      if (!isOpen) {
        // Always re-read on open: the terminal below the editor is writing to
        // the same disk, so a cached listing is only ever a guess.
        load(directoryPath);
      }
    },
    [expanded, load],
  );

  const collapseAll = useCallback(() => setExpanded({}), []);

  const refreshAll = useCallback(() => {
    Object.keys(entries).forEach(load);
  }, [entries, load]);

  const startCreate = useCallback(
    (parentPath, type) => {
      setMenu(null);
      setExpanded(current => ({...current, [parentPath]: true}));
      load(parentPath);
      setDraft({mode: 'create', parentPath, type, initialName: '', error: null});
    },
    [load],
  );

  const startRename = useCallback(entry => {
    setMenu(null);
    setDraft({mode: 'rename', targetPath: entry.fullPath, isDirectory: entry.isDirectory, initialName: entry.name, error: null});
  }, []);

  const cancelDraft = useCallback(() => setDraft(null), []);

  const clearDraftError = useCallback(() => {
    setDraft(current => (current?.error ? {...current, error: null} : current));
  }, []);

  /**
   * Answers whether the field is finished with. A name the disk or the tree
   * refuses leaves it open with something to fix, and the row it belongs to
   * needs to know that to keep taking input.
   */
  const commitDraft = useCallback(
    async name => {
      if (!draft) {
        return true;
      }

      const parentPath = draft.mode === 'rename' ? parentOf(draft.targetPath) : draft.parentPath;
      const nameProblem = validateName(name, entries[parentPath] ?? [], draft.targetPath);

      if (nameProblem) {
        setDraft(current => (current ? {...current, error: nameProblem} : current));
        return false;
      }

      const destination = joinPath(parentPath, name.trim());

      try {
        if (draft.mode === 'rename') {
          if (destination === draft.targetPath) {
            setDraft(null);
            return true;
          }

          await fileSystem.renameEntry(projectRoot, draft.targetPath, destination);
          setDraft(null);

          if (draft.isDirectory) {
            forgetSubtree(draft.targetPath);
          }

          await reveal(destination, false);
          setSelected(current =>
            current?.fullPath === draft.targetPath
              ? {...current, name: destination.split('/').pop(), fullPath: destination}
              : current,
          );
          onEntryRenamed?.(draft.targetPath, destination);
          return true;
        }

        await fileSystem.createEntry(projectRoot, destination, draft.type);
        setDraft(null);
        await reveal(destination, draft.type === 'directory');

        if (draft.type === 'file') {
          onOpenFile?.(destination);
        }

        return true;
      } catch (error) {
        setDraft(current => (current ? {...current, error: error.message} : current));
        return false;
      }
    },
    [draft, entries, projectRoot, reveal, forgetSubtree, onEntryRenamed, onOpenFile],
  );

  const copy = useCallback(entry => {
    setMenu(null);
    setProblem(null);
    setClipboard({entry, mode: 'copy'});
  }, []);

  const cut = useCallback(entry => {
    setMenu(null);
    setProblem(null);
    setClipboard({entry, mode: 'cut'});
  }, []);

  /**
   * A cut and a copy are different operations on the disk but the same one
   * here: put the entry under `directoryPath`. Moving is the rename endpoint
   * seen from another angle, and copying is a create whose contents come from
   * somewhere else — which is also why only the copy renames itself out of a
   * collision. A move onto an existing name is a question for the user, not
   * something to answer with a second file.
   */
  const paste = useCallback(
    async directoryPath => {
      setMenu(null);
      setProblem(null);

      if (!clipboard) {
        return;
      }

      const {entry, mode} = clipboard;
      const destination = joinPath(directoryPath, entry.name);

      // Pasting a folder into itself, or into anything inside it, would put the
      // copy inside the thing being copied. The server refuses it too; catching
      // it here is what turns it into a sentence instead of a failed request.
      if (entry.isDirectory && (directoryPath === entry.fullPath || directoryPath.startsWith(`${entry.fullPath}/`))) {
        setProblem(`${entry.name} cannot be pasted into itself`);
        return;
      }

      try {
        if (mode === 'cut') {
          // Already where it is being sent. Nothing to do, and the rename
          // endpoint would rightly call it a collision.
          if (parentOf(entry.fullPath) === directoryPath) {
            setClipboard(null);
            return;
          }

          await fileSystem.renameEntry(projectRoot, entry.fullPath, destination);
          setClipboard(null);

          if (entry.isDirectory) {
            forgetSubtree(entry.fullPath);
          }

          await load(parentOf(entry.fullPath));
          await reveal(destination, false);
          onEntryRenamed?.(entry.fullPath, destination);
          return;
        }

        // The name it was given may already have been taken, so where the copy
        // landed is the server's answer rather than ours.
        const response = await fileSystem.copyEntry(projectRoot, destination, entry.fullPath);

        await reveal(response.path ?? destination, false);
      } catch (error) {
        setProblem(error.message);
      }
    },
    [clipboard, projectRoot, load, reveal, forgetSubtree, onEntryRenamed],
  );

  const requestDelete = useCallback(entry => {
    setMenu(null);
    setProblem(null);
    setPendingDelete(entry);
  }, []);

  const confirmDelete = useCallback(async () => {
    const entry = pendingDelete;

    if (!entry) {
      return;
    }

    setPendingDelete(null);

    try {
      await fileSystem.deleteEntry(projectRoot, entry.fullPath);
    } catch (error) {
      setProblem(error.message);
      return;
    }

    setSelected(current => (current?.fullPath === entry.fullPath ? null : current));
    setClipboard(current => (current?.entry.fullPath === entry.fullPath ? null : current));

    if (entry.isDirectory) {
      forgetSubtree(entry.fullPath);
    }

    await load(parentOf(entry.fullPath));
    onEntryRemoved?.(entry.fullPath, entry.isDirectory);
  }, [pendingDelete, projectRoot, load, forgetSubtree, onEntryRemoved]);

  const value = {
    projectRoot,
    currentFile,
    entries,
    expanded,
    draft,
    menu,
    pendingDelete,
    selected,
    clipboard,
    problem,
    treeRef: tree,
    onOpenFile,
    select: setSelected,
    focusTree: () => tree.current?.focus?.(),
    toggleDirectory,
    collapseAll,
    refreshAll,
    startCreate,
    startRename,
    cancelDraft,
    clearDraftError,
    commitDraft,
    openMenu: setMenu,
    closeMenu: () => setMenu(null),
    copy,
    cut,
    paste,
    dismissProblem: () => setProblem(null),
    requestDelete,
    confirmDelete,
    cancelDelete: () => setPendingDelete(null),
  };

  return <FileTreeContext.Provider value={value}>{children}</FileTreeContext.Provider>;
}
