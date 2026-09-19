import {useCallback, useEffect, useRef, useState} from 'react';

import {fileSystem} from '../fileSystem';
import {sortFiles} from './sortFiles';

/**
 * The tree as data: which folders are open and what each one holds. Folders
 * are fetched when first expanded and refetched when the watcher says
 * something inside them changed, so the rows always reflect the disk.
 *
 * Paths are project-relative; '' is the root.
 */
export function useFileTree(projectRoot, {onError} = {}) {
  const [children, setChildren] = useState({});
  const [expanded, setExpanded] = useState(() => new Set());
  const [loading, setLoading] = useState(() => new Set());
  const alive = useRef(true);
  const root = useRef(projectRoot);
  const errorHandler = useRef(onError);
  errorHandler.current = onError;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(
    async path => {
      if (!projectRoot) {
        return;
      }

      setLoading(current => new Set(current).add(path));

      try {
        const response = await fileSystem.listFiles(projectRoot, path);

        if (!alive.current || root.current !== projectRoot) {
          return;
        }

        setChildren(current => ({...current, [path]: sortFiles(response.contents ?? [])}));
      } catch (error) {
        errorHandler.current?.(error);
      } finally {
        if (alive.current) {
          setLoading(current => {
            const next = new Set(current);
            next.delete(path);
            return next;
          });
        }
      }
    },
    [projectRoot],
  );

  // A new project starts from nothing: only its root is fetched.
  useEffect(() => {
    root.current = projectRoot;
    setChildren({});
    setExpanded(new Set());

    if (projectRoot) {
      load('');
    }
  }, [projectRoot, load]);

  const toggle = useCallback(
    path => {
      setExpanded(current => {
        const next = new Set(current);

        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
          if (!children[path]) {
            load(path);
          }
        }

        return next;
      });
    },
    [children, load],
  );

  const expand = useCallback(
    path => {
      setExpanded(current => {
        if (current.has(path)) {
          return current;
        }
        const next = new Set(current);
        next.add(path);
        return next;
      });

      if (!children[path]) {
        load(path);
      }
    },
    [children, load],
  );

  /** Open every folder on the way to `path`, so it can be shown selected. */
  const reveal = useCallback(
    path => {
      const parts = path.split('/').slice(0, -1);
      let current = '';

      for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        expand(current);
      }
    },
    [expand],
  );

  /** The watcher's batch: refetch every folder that is showing and had a change. */
  const applyChanges = useCallback(
    changes => {
      const folders = new Set();

      for (const change of changes) {
        const parent = change.path.includes('/') ? change.path.slice(0, change.path.lastIndexOf('/')) : '';
        folders.add(parent);

        // A folder that was removed takes its listing with it.
        if (change.kind === 'delete') {
          setChildren(current => {
            if (!(change.path in current)) {
              return current;
            }
            const next = {...current};
            delete next[change.path];
            return next;
          });
        }
      }

      for (const folder of folders) {
        if (folder === '' || expanded.has(folder) || children[folder]) {
          load(folder);
        }
      }
    },
    [expanded, children, load],
  );

  const refresh = useCallback(() => {
    load('');
    for (const path of expanded) {
      load(path);
    }
  }, [expanded, load]);

  return {children, expanded, loading, toggle, expand, reveal, applyChanges, refresh, load};
}

/**
 * The rows the tree renders, flattened in display order: every expanded
 * folder's children follow it, indented one level deeper.
 */
export function flattenTree(children, expanded, path = '', depth = 0) {
  const rows = [];

  for (const entry of children[path] ?? []) {
    const isOpen = entry.isDirectory && expanded.has(entry.fullPath);
    rows.push({...entry, depth, isOpen});

    if (isOpen) {
      rows.push(...flattenTree(children, expanded, entry.fullPath, depth + 1));
    }
  }

  return rows;
}
