import fs from 'node:fs';
import path from 'node:path';

/**
 * File change notifications, over a WebSocket, per project.
 *
 * The tree and the buffers go stale the moment anything but the editor touches
 * the project — the terminal, `git checkout`, another editor. macOS gives us a
 * recursive `fs.watch`, so one watcher covers the project; events are batched
 * for a beat so a `git checkout` that touches hundreds of files arrives as one
 * message rather than hundreds.
 */
export const ENDPOINT = '/events';

const DEBOUNCE_MS = 120;

/** Folders whose churn nobody wants to hear about. */
const IGNORED = new Set(['node_modules', '.git', 'Pods', 'build', 'dist', 'DerivedData', '.DS_Store']);

export function isIgnored(relativePath) {
  return relativePath
    .split(/[\\/]/)
    .some(segment => IGNORED.has(segment));
}

/**
 * The repository's own bookkeeping is otherwise ignored, but a commit, a
 * checkout or a stage happens there and nowhere else — so these few files are
 * reported, as a `git` change, and the client refreshes its status.
 */
export function isGitBookkeeping(relativePath) {
  return /^\.git\/(index|HEAD|ORIG_HEAD|refs\/|packed-refs)/.test(relativePath.replace(/\\/g, '/'));
}

export function watchProject(projectRoot, onChanges) {
  const root = path.resolve(projectRoot);
  let pending = new Map();
  let timer = null;

  const flush = () => {
    timer = null;
    const changes = [...pending.values()];
    pending = new Map();

    if (changes.length) {
      onChanges(changes);
    }
  };

  let watcher;

  try {
    watcher = fs.watch(root, {recursive: true}, (eventType, filename) => {
      if (!filename) {
        return;
      }

      const relative = String(filename);

      if (isGitBookkeeping(relative)) {
        pending.set('.git', {path: '.git', kind: 'git', exists: true});
        if (!timer) {
          timer = setTimeout(flush, DEBOUNCE_MS);
        }
        return;
      }

      if (isIgnored(relative)) {
        return;
      }

      // `rename` covers create, delete and move; a stat tells them apart.
      let kind = eventType === 'change' ? 'change' : 'rename';
      let exists = true;

      try {
        fs.statSync(path.join(root, relative));
      } catch (error) {
        exists = false;
      }

      if (kind === 'rename') {
        kind = exists ? 'create' : 'delete';
      }

      pending.set(relative, {path: relative, kind, exists});

      if (!timer) {
        timer = setTimeout(flush, DEBOUNCE_MS);
      }
    });
  } catch (error) {
    console.error(`Cannot watch ${root}: ${error}`);
    return () => {};
  }

  watcher.on('error', error => console.error(`Watcher error for ${root}: ${error}`));

  return () => {
    clearTimeout(timer);
    watcher.close();
  };
}

/**
 * One watcher per project, shared by however many panels are listening. It is
 * closed when the last listener leaves.
 */
const shared = new Map();

export function subscribe(projectRoot, listener) {
  const root = path.resolve(projectRoot);
  let entry = shared.get(root);

  if (!entry) {
    entry = {listeners: new Set(), close: null};
    entry.close = watchProject(root, changes => {
      for (const callback of entry.listeners) {
        callback(changes);
      }
    });
    shared.set(root, entry);
  }

  entry.listeners.add(listener);

  return () => {
    entry.listeners.delete(listener);

    if (entry.listeners.size === 0) {
      entry.close();
      shared.delete(root);
    }
  };
}

export function openEvents(connection, searchParams) {
  const projectRoot = searchParams.get('projectRoot');

  if (!projectRoot || !fs.existsSync(projectRoot)) {
    connection.send(JSON.stringify({type: 'error', message: 'projectRoot is not a directory'}));
    connection.close();
    return;
  }

  const unsubscribe = subscribe(projectRoot, changes => {
    if (connection.readyState === connection.OPEN) {
      connection.send(JSON.stringify({type: 'fs', changes}));
    }
  });

  connection.send(JSON.stringify({type: 'ready', projectRoot}));
  connection.on('close', unsubscribe);
}
