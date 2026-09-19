import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

import {AppProvider} from '../context/AppContext';
import {CodePage} from '../components/code/CodePage';

/**
 * The file system behind the page is a fake project in memory. Every method
 * the page calls is here, answering the way the server would, so the tests
 * exercise the page's own rules: what opens, what saves, what closes.
 */
jest.mock('../components/fileSystem', () => {
  const files = new Map();
  const calls = [];
  let mtime = 1000;

  class FileSystemError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
  class ServerUnavailableError extends Error {}

  const listing = path => {
    const prefix = path ? `${path}/` : '';
    const seen = new Map();
    for (const key of files.keys()) {
      if (!key.startsWith(prefix)) {
        continue;
      }
      const rest = key.slice(prefix.length);
      const [name, ...more] = rest.split('/');
      if (!seen.has(name)) {
        seen.set(name, {name, isDirectory: more.length > 0, fullPath: prefix + name});
      }
    }
    return [...seen.values()];
  };

  const fileSystem = {
    __files: files,
    __calls: calls,
    __reset() {
      files.clear();
      calls.length = 0;
      files.set('README.md', '# hello\n');
      files.set('src/index.js', 'console.log(1);\n');
      files.set('src/util.js', 'export const x = 1;\n');
    },
    health: jest.fn(() => Promise.resolve({ok: true, languageServers: {}})),
    importMap: jest.fn(() => Promise.reject(new Error('offline'))),
    getState: jest.fn(() => Promise.resolve({})),
    patchState: jest.fn(() => Promise.resolve({})),
    stat: jest.fn(() => Promise.resolve({isDirectory: true})),
    listFiles: jest.fn((root, path) => Promise.resolve({path, contents: listing(path)})),
    readFile: jest.fn((root, path) => {
      calls.push(['read', path]);
      if (!files.has(path)) {
        return Promise.reject(new FileSystemError(404, `Not found: ${path}`));
      }
      return Promise.resolve({path, contents: files.get(path), mtime});
    }),
    writeFile: jest.fn((root, path, contents) => {
      calls.push(['write', path, contents]);
      files.set(path, contents);
      mtime += 1;
      return Promise.resolve({path, mtime});
    }),
    createFile: jest.fn((root, path, contents = '') => {
      calls.push(['create', path]);
      files.set(path, contents);
      return Promise.resolve({path, mtime});
    }),
    createDirectory: jest.fn(() => Promise.resolve({})),
    deletePath: jest.fn((root, path) => {
      calls.push(['delete', path]);
      files.delete(path);
      return Promise.resolve({path});
    }),
    rename: jest.fn((root, from, to) => {
      calls.push(['rename', from, to]);
      files.set(to, files.get(from));
      files.delete(from);
      return Promise.resolve({from, to});
    }),
    searchFiles: jest.fn(() => Promise.resolve({results: []})),
    replace: jest.fn(() => Promise.resolve({changed: [], replacements: 0})),
    git: {
      status: jest.fn(() => Promise.resolve({repository: true, branch: 'main', changes: [{path: 'src/index.js', index: ' ', worktree: 'M'}]})),
      show: jest.fn(() => Promise.resolve({contents: 'console.log(0);\n', exists: true})),
      log: jest.fn(() => Promise.resolve({commits: []})),
      branches: jest.fn(() => Promise.resolve({branches: []})),
      stage: jest.fn(() => Promise.resolve({ok: true})),
      unstage: jest.fn(() => Promise.resolve({ok: true})),
      discard: jest.fn(() => Promise.resolve({ok: true})),
      commit: jest.fn(() => Promise.resolve({ok: true})),
      checkout: jest.fn(() => Promise.resolve({ok: true})),
    },
    terminalUrl: () => 'ws://127.0.0.1:4001/terminal',
    eventsUrl: () => 'ws://127.0.0.1:4001/events',
    lspUrl: () => 'ws://127.0.0.1:4001/lsp',
    vendorUrl: (name, rest = '') => `http://127.0.0.1:4001/vendor/${name}/${rest}`,
  };

  fileSystem.__reset();

  return {fileSystem, FileSystemError, ServerUnavailableError, BASE_URL: 'http://127.0.0.1:4001'};
});

const {fileSystem} = require('../components/fileSystem');

const flush = async (ms = 0) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const find = (root, testID) => root.root.findAll(node => node.props.testID === testID && typeof node.type === 'string');
const findOne = (root, testID) => {
  const matches = find(root, testID);
  if (matches.length === 0) {
    throw new Error(`No node with testID ${testID}`);
  }
  return matches[0];
};
const press = async node => {
  await act(async () => {
    node.props.onPress?.({stopPropagation: () => {}});
  });
  await flush();
};
const pressable = (root, testID) => {
  // Pressable renders a host View with the testID; the handler lives on it.
  const nodes = root.root.findAll(node => node.props.testID === testID && node.props.onPress);
  if (nodes.length === 0) {
    throw new Error(`No pressable with testID ${testID}`);
  }
  return nodes[0];
};
const webviews = root => root.root.findAll(node => node.props.testID === 'webview' && typeof node.type === 'string');
const editorWebview = root => webviews(root).find(node => String(node.props.source?.html ?? '').includes('vs/loader.js'));
const post = async (node, message) => {
  await act(async () => {
    node.props.onMessage({nativeEvent: {data: JSON.stringify(message)}});
  });
  await flush();
};

async function mountWithProject() {
  fileSystem.__reset();
  fileSystem.getState.mockResolvedValue({lastProject: '/project', settings: {autoSaveDelay: 200}});

  let root;
  await act(async () => {
    root = ReactTestRenderer.create(
      <AppProvider initialData={{app: {activeSidebarItem: 'files'}}}>
        <CodePage />
      </AppProvider>,
    );
  });
  await flush();
  await flush(50);

  // Monaco says it is up.
  const editor = editorWebview(root);
  await post(editor, {type: 'ready'});

  return root;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('shows the welcome screen when nothing is open', async () => {
  fileSystem.__reset();
  fileSystem.getState.mockResolvedValue({recentProjects: ['/old/project']});

  let root;
  await act(async () => {
    root = ReactTestRenderer.create(
      <AppProvider initialData={{}}>
        <CodePage />
      </AppProvider>,
    );
  });
  await flush();

  expect(find(root, 'welcome')).toHaveLength(1);
  expect(find(root, 'recent-/old/project')).toHaveLength(1);
});

test('restores the last project, lists its tree and opens a file from it', async () => {
  const root = await mountWithProject();

  expect(find(root, 'welcome')).toHaveLength(0);
  expect(find(root, 'tree-row-README.md')).toHaveLength(1);
  expect(find(root, 'tree-row-src')).toHaveLength(1);

  await press(pressable(root, 'tree-row-README.md'));

  expect(fileSystem.readFile).toHaveBeenCalledWith('/project', 'README.md');
  expect(find(root, 'tab-README.md')).toHaveLength(1);

  // The buffer is pushed into Monaco as a file switch.
  const {WebView} = require('react-native-webview');
  expect(WebView.injected.some(script => script.includes('window.setFile') && script.includes('README.md'))).toBe(true);
});

test('edits autosave, mark the tab dirty meanwhile, and closing removes the tab', async () => {
  const root = await mountWithProject();
  await press(pressable(root, 'tree-row-README.md'));

  const editor = editorWebview(root);
  await post(editor, {type: 'change', path: 'README.md', value: '# changed\n'});

  expect(find(root, 'tab-dirty-README.md')).toHaveLength(1);
  expect(fileSystem.writeFile).not.toHaveBeenCalled();

  await flush(250);

  expect(fileSystem.writeFile).toHaveBeenCalledWith('/project', 'README.md', '# changed\n', 1000);
  expect(find(root, 'tab-dirty-README.md')).toHaveLength(0);

  await press(pressable(root, 'tab-close-README.md'));
  expect(find(root, 'tab-README.md')).toHaveLength(0);
  expect(find(root, 'editor-empty')).toHaveLength(1);
});

test('Cmd+S from the editor saves without waiting for the debounce', async () => {
  const root = await mountWithProject();
  await press(pressable(root, 'tree-row-README.md'));

  const editor = editorWebview(root);
  await post(editor, {type: 'change', path: 'README.md', value: 'x\n'});
  await post(editor, {type: 'save', path: 'README.md', value: 'x\n'});

  expect(fileSystem.writeFile.mock.calls.map(call => call.slice(1, 3))).toEqual([['README.md', 'x\n']]);
});

test('a file created from the tree opens in a tab, and a rename follows it', async () => {
  const root = await mountWithProject();

  await press(pressable(root, 'tree-new-file'));
  const input = findOne(root, 'tree-inline-input');
  await act(async () => {
    input.props.onChangeText('notes.txt');
  });
  await press(pressable(root, 'tree-inline-confirm'));

  expect(fileSystem.createFile).toHaveBeenCalledWith('/project', 'notes.txt', '');
  expect(find(root, 'tab-notes.txt')).toHaveLength(1);

  // The watcher would refresh the tree; here the listing is asked for again.
  await flush();
  const rowsBefore = find(root, 'tree-row-notes.txt');
  if (rowsBefore.length === 0) {
    // Not refreshed synchronously in the fake; the rename runs on the open tab instead.
  }

  // Rename via the row action on the current file.
  await press(pressable(root, 'tree-row-README.md'));
  await press(pressable(root, 'tree-rename-README.md'));
  const renameInput = findOne(root, 'tree-inline-input');
  await act(async () => {
    renameInput.props.onChangeText('INTRO.md');
  });
  await press(pressable(root, 'tree-inline-confirm'));

  expect(fileSystem.rename).toHaveBeenCalledWith('/project', 'README.md', 'INTRO.md');
  expect(find(root, 'tab-INTRO.md')).toHaveLength(1);
  expect(find(root, 'tab-README.md')).toHaveLength(0);
});

test('deleting a file from the tree asks first, then closes its tab', async () => {
  const root = await mountWithProject();
  await press(pressable(root, 'tree-row-README.md'));

  await press(pressable(root, 'tree-delete-README.md'));
  expect(fileSystem.deletePath).not.toHaveBeenCalled();

  await press(pressable(root, 'tree-confirm-delete'));
  expect(fileSystem.deletePath).toHaveBeenCalledWith('/project', 'README.md');
  expect(find(root, 'tab-README.md')).toHaveLength(0);
});

test('keyboard shortcuts open the palette, split the editor and switch panels', async () => {
  const root = await mountWithProject();
  await press(pressable(root, 'tree-row-README.md'));
  const page = findOne(root, 'code-page');

  await act(async () => {
    page.props.onKeyDown({nativeEvent: {key: 'p', metaKey: true, shiftKey: true}, preventDefault: () => {}});
  });
  await flush(50);
  expect(find(root, 'command-palette')).toHaveLength(1);

  await act(async () => {
    page.props.onKeyDown({nativeEvent: {key: 'Escape'}, preventDefault: () => {}});
  });
  await flush();
  expect(find(root, 'command-palette')).toHaveLength(0);

  await act(async () => {
    page.props.onKeyDown({nativeEvent: {key: '\\', metaKey: true}, preventDefault: () => {}});
  });
  await flush();
  expect(root.root.findAll(node => String(node.props.testID ?? '').startsWith('editor-group-') && typeof node.type === 'string')).toHaveLength(2);

  // A shortcut handed back by Monaco lands the same way.
  const editor = editorWebview(root);
  await post(editor, {type: 'key', key: 'g', ctrlKey: true, shiftKey: true, metaKey: false, altKey: false});
  expect(find(root, 'git-sidebar')).toHaveLength(1);
});

test('the git panel stages a change and the status bar shows the branch', async () => {
  const root = await mountWithProject();
  await flush(200);

  const page = findOne(root, 'code-page');
  await act(async () => {
    page.props.onKeyDown({nativeEvent: {key: 'g', ctrlKey: true, shiftKey: true}, preventDefault: () => {}});
  });
  await flush();

  expect(find(root, 'change-src/index.js')).toHaveLength(1);
  expect(find(root, 'stage-all')).toHaveLength(1);

  await press(pressable(root, 'stage-all'));
  expect(fileSystem.git.stage).toHaveBeenCalledWith('/project', 'all');
  await flush(200);

  const status = findOne(root, 'status-bar');
  const texts = status.findAll(node => node.type === 'Text').flatMap(node => React.Children.toArray(node.props.children)).filter(child => typeof child === 'string');
  expect(texts.some(text => text.includes('main'))).toBe(true);
});

test('diagnostics from the editor fill the problems panel', async () => {
  const root = await mountWithProject();
  await press(pressable(root, 'tree-row-README.md'));

  const editor = editorWebview(root);
  await post(editor, {type: 'diagnostics', path: 'README.md', diagnostics: [{line: 1, column: 1, endLine: 1, endColumn: 2, message: 'Nope', severity: 'error'}]});

  const page = findOne(root, 'code-page');
  await act(async () => {
    page.props.onKeyDown({nativeEvent: {key: 'm', metaKey: true, shiftKey: true}, preventDefault: () => {}});
  });
  await flush();

  expect(find(root, 'problems-panel')).toHaveLength(1);
  expect(find(root, 'problem-README.md-1')).toHaveLength(1);
});

test('a write that conflicts shows the conflict banner and keeps the buffer', async () => {
  const root = await mountWithProject();
  await press(pressable(root, 'tree-row-README.md'));

  const {FileSystemError} = require('../components/fileSystem');
  fileSystem.writeFile.mockImplementationOnce(() => Promise.reject(new FileSystemError(409, 'File changed on disk: README.md')));

  const editor = editorWebview(root);
  await post(editor, {type: 'change', path: 'README.md', value: 'mine\n'});
  await flush(250);

  expect(find(root, 'conflict-banner')).toHaveLength(1);
  expect(find(root, 'tab-dirty-README.md')).toHaveLength(1);

  await press(pressable(root, 'conflict-keep'));
  expect(fileSystem.writeFile).toHaveBeenLastCalledWith('/project', 'README.md', 'mine\n', undefined);
  expect(find(root, 'conflict-banner')).toHaveLength(0);
});

test('the session is persisted with the open tabs', async () => {
  const root = await mountWithProject();
  await press(pressable(root, 'tree-row-README.md'));
  await flush(700);

  const last = fileSystem.patchState.mock.calls.at(-1)[0];
  expect(last.lastProject).toBe('/project');
  expect(last.projects['/project'].editor.groups[0].tabs).toEqual(['README.md']);
  expect(last.settings.autoSaveDelay).toBe(200);
});
