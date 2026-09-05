/**
 * The explorer's editing half: what the tree asks the file server to do, and
 * what it refuses to ask at all. The server's own guards are exercised over
 * HTTP; these are the rules the tree enforces before it gets that far.
 *
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text, TextInput} from 'react-native';

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: ({children}) => children ?? null,
  SvgXml: () => null,
  Path: () => null,
  Circle: () => null,
}));

jest.mock('../components/fileSystem', () => ({
  fileSystem: {
    listFiles: jest.fn(),
    createEntry: jest.fn(),
    renameEntry: jest.fn(),
    deleteEntry: jest.fn(),
  },
}));

const {fileSystem} = require('../components/fileSystem');
const {FileTree} = require('../components/code/FileTree');

const TREE = {
  '': [
    {name: 'app', isDirectory: true, fullPath: 'app'},
    {name: 'README.md', isDirectory: false, fullPath: 'README.md'},
  ],
  app: [{name: 'main.js', isDirectory: false, fullPath: 'app/main.js'}],
};

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(() => Promise.resolve({json: () => Promise.resolve({})}));
  fileSystem.listFiles.mockImplementation((root, path) => Promise.resolve({contents: [...(TREE[path] ?? [])]}));
  fileSystem.createEntry.mockResolvedValue({});
  fileSystem.renameEntry.mockResolvedValue({});
  fileSystem.deleteEntry.mockResolvedValue({});
});

// `Pressable` is wrapped, so it isn't findable by type; anything with an
// onPress is a button as far as this test is concerned.
function pressables(node) {
  return node.findAll(candidate => typeof candidate.props.onPress === 'function', {deep: true});
}

// A right-click, as AppKit delivers one: an ordinary touch carrying the button
// it came from. `Pressability` drops those, so the row claims them one layer
// down, in the responder system — which is what this drives.
function secondaryClick(tree, name) {
  const claim = claimFor(tree, name);
  const event = {nativeEvent: {button: 2, pageX: 220, pageY: 130}};

  expect(claim.props.onStartShouldSetResponderCapture(event)).toBe(true);

  return claim.props.onResponderGrant(event);
}

// The view wrapping a row that watches for a secondary click, and the row
// itself — the `Pressable` an ordinary click still goes to.
function claimFor(tree, name) {
  return tree.root.findAll(
    node => typeof node.props.onStartShouldSetResponderCapture === 'function' && texts(node).includes(name),
  )[0];
}

function rowFor(tree, name) {
  return tree.root.findAll(node => typeof node.props.onLongPress === 'function' && texts(node).includes(name))[0];
}

// The space the rows sit in. `Pressable` puts responder handlers on everything
// it renders, so what singles this one out is that it holds the whole listing
// and watches for the click on the way back up rather than on the way down.
function rootClaim(tree) {
  return tree.root.findAll(
    node =>
      typeof node.props.onResponderGrant === 'function' &&
      typeof node.props.onStartShouldSetResponderCapture !== 'function' &&
      texts(node).includes('app') &&
      texts(node).includes('README.md'),
  )[0];
}

// Escape out of the inline field. A single-line field on macOS reports it as a
// key press rather than a key down, so that is what a real one looks like.
function escape(tree) {
  return tree.root.findByType(TextInput).props.onKeyPress({nativeEvent: {key: 'Escape'}});
}

// The panel is the only thing here that takes key events; on macOS they are
// delivered to whatever holds focus, which is it.
function pressKey(tree, key) {
  const panel = tree.root.findAll(node => typeof node.props.onKeyDown === 'function' && node.props.keyDownEvents)[0];

  return panel.props.onKeyDown({nativeEvent: {key}});
}

// `Delete {name}?` reaches the node as three children, so a row's label is
// whatever its Text nodes say once they are put back together.
function texts(root) {
  return root
    .findAllByType(Text)
    .map(node => [].concat(node.props.children).filter(child => typeof child === 'string').join(''))
    .filter(Boolean);
}

/**
 * Every interaction is followed by a second, empty flush: the palette each
 * newly mounted component fetches settles a tick after the interaction does,
 * and React counts anything left over as an update outside `act`.
 */
async function settle(action) {
  await ReactTestRenderer.act(async () => action());
  await ReactTestRenderer.act(async () => {});
}

async function render(props = {}) {
  let tree;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<FileTree projectRoot="/p" onOpenFile={jest.fn()} setProjectRoot={jest.fn()} {...props} />);
  });

  // The palette is fetched too, and settles a tick after the listing does.
  await ReactTestRenderer.act(async () => {});

  return tree;
}

test('lists the project root', async () => {
  const tree = await render();
  expect(fileSystem.listFiles).toHaveBeenCalledWith('/p', '');
  expect(texts(tree.root)).toEqual(expect.arrayContaining(['app', 'README.md']));
});

test('expands a folder on press', async () => {
  const tree = await render();
  const folderRow = pressables(tree.root).find(node => texts(node).includes('app'));

  await settle(() => folderRow.props.onPress());

  expect(fileSystem.listFiles).toHaveBeenCalledWith('/p', 'app');
  expect(texts(tree.root)).toEqual(expect.arrayContaining(['main.js']));
});

test('creates a file from the header, then opens it', async () => {
  const onOpenFile = jest.fn();
  const tree = await render({onOpenFile});

  // The header actions are new file / new folder / refresh / collapse all.
  const headerActions = pressables(tree.root).slice(1, 5);
  await settle(() => headerActions[0].props.onPress());

  const input = tree.root.findByType(TextInput);
  await settle(() => input.props.onChangeText('models/user.rb'));
  await settle(() => tree.root.findByType(TextInput).props.onSubmitEditing());

  expect(fileSystem.createEntry).toHaveBeenCalledWith('/p', 'models/user.rb', 'file');
  expect(onOpenFile).toHaveBeenCalledWith('models/user.rb');
});

test('refuses a name that is already taken, without calling the server', async () => {
  const tree = await render();

  const headerActions = pressables(tree.root).slice(1, 5);
  await settle(() => headerActions[0].props.onPress());

  const input = tree.root.findByType(TextInput);
  await settle(() => input.props.onChangeText('README.md'));
  await settle(() => tree.root.findByType(TextInput).props.onSubmitEditing());

  expect(fileSystem.createEntry).not.toHaveBeenCalled();
  expect(texts(tree.root)).toEqual(expect.arrayContaining(['README.md already exists here']));

  // The field is still open, and still takes input: a rejected name has to be
  // fixable without starting over.
  await settle(() => tree.root.findByType(TextInput).props.onChangeText('READING.md'));
  await settle(() => tree.root.findByType(TextInput).props.onSubmitEditing());

  expect(fileSystem.createEntry).toHaveBeenCalledWith('/p', 'READING.md', 'file');
});

test('a secondary click opens the menu, and the row never sees the press', async () => {
  const onOpenFile = jest.fn();
  const tree = await render({onOpenFile});

  await settle(() => secondaryClick(tree, 'README.md'));

  expect(texts(tree.root)).toEqual(expect.arrayContaining(['New file', 'Rename', 'Delete']));

  // The claim `secondaryClick` asserts is what keeps the touch from ever
  // reaching the row, so the file behind the menu stays closed.
  expect(onOpenFile).not.toHaveBeenCalled();
});

test('a left click is left for the row itself, and opens the file', async () => {
  const onOpenFile = jest.fn();
  const tree = await render({onOpenFile});

  // Nothing claims a primary click on the way down, so it reaches the row.
  const claim = claimFor(tree, 'README.md');
  expect(claim.props.onStartShouldSetResponderCapture({nativeEvent: {button: 0}})).toBe(false);

  const row = rowFor(tree, 'README.md');
  await settle(() => row.props.onPressIn({nativeEvent: {button: 0}}));
  await settle(() => row.props.onPress());

  expect(onOpenFile).toHaveBeenCalledWith('README.md');
});

test('a secondary click below the rows offers to add to the project root', async () => {
  const tree = await render();

  const root = rootClaim(tree);
  const event = {nativeEvent: {button: 2, pageX: 200, pageY: 400}};

  expect(root.props.onStartShouldSetResponder(event)).toBe(true);
  await settle(() => root.props.onResponderGrant(event));

  // Nothing to rename or delete up there — the project root is not a row.
  expect(texts(tree.root)).toEqual(expect.arrayContaining(['New file', 'New folder']));
  expect(texts(tree.root)).not.toEqual(expect.arrayContaining(['Rename']));
});

test('Return renames the selected row, Backspace asks to delete it', async () => {
  const tree = await render();

  // Nothing is selected until a row is pressed, and the shortcuts stay quiet.
  await settle(() => pressKey(tree, 'Enter'));
  expect(tree.root.findAllByType(TextInput)).toHaveLength(0);

  await settle(() => rowFor(tree, 'README.md').props.onPressIn({nativeEvent: {button: 0}}));
  await settle(() => pressKey(tree, 'Enter'));

  expect(tree.root.findByType(TextInput).props.value).toBe('README.md');

  // The field owns the keyboard while it is open: its own Return bubbles back
  // out to the panel, which must not answer it by reopening the field.
  await settle(() => pressKey(tree, 'Backspace'));
  expect(texts(tree.root)).not.toEqual(expect.arrayContaining(['Delete README.md?']));

  await settle(() => escape(tree));
  await settle(() => pressKey(tree, 'Backspace'));

  expect(texts(tree.root)).toEqual(expect.arrayContaining(['Delete README.md?']));
});

test('Escape abandons a rename, and abandons a new file without creating it', async () => {
  const tree = await render();

  await settle(() => secondaryClick(tree, 'README.md'));
  await settle(() => pressables(tree.root).find(node => texts(node).includes('Rename')).props.onPress());

  await settle(() => tree.root.findByType(TextInput).props.onChangeText('gone.md'));
  await settle(() => escape(tree));

  expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  expect(fileSystem.renameEntry).not.toHaveBeenCalled();
  expect(texts(tree.root)).toEqual(expect.arrayContaining(['README.md']));

  // And the same for a name that was never going to exist.
  const headerActions = pressables(tree.root).slice(1, 5);
  await settle(() => headerActions[0].props.onPress());
  await settle(() => tree.root.findByType(TextInput).props.onChangeText('never.md'));
  await settle(() => escape(tree));

  expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  expect(fileSystem.createEntry).not.toHaveBeenCalled();
});

test('renames through the row menu and reports the move', async () => {
  const onEntryRenamed = jest.fn();
  const tree = await render({onEntryRenamed});

  await settle(() => secondaryClick(tree, 'README.md'));

  const rename = pressables(tree.root).find(node => texts(node).includes('Rename'));
  await settle(() => rename.props.onPress());

  const input = tree.root.findByType(TextInput);
  expect(input.props.value).toBe('README.md');

  await settle(() => input.props.onChangeText('READ.md'));
  await settle(() => tree.root.findByType(TextInput).props.onSubmitEditing());

  expect(fileSystem.renameEntry).toHaveBeenCalledWith('/p', 'README.md', 'READ.md');
  expect(onEntryRenamed).toHaveBeenCalledWith('README.md', 'READ.md');
});

test('deletes only after the dialog is confirmed', async () => {
  const onEntryRemoved = jest.fn();
  const tree = await render({onEntryRemoved});

  await settle(() => secondaryClick(tree, 'README.md'));

  const remove = pressables(tree.root).find(node => texts(node).includes('Delete'));
  await settle(() => remove.props.onPress());

  expect(fileSystem.deleteEntry).not.toHaveBeenCalled();
  expect(texts(tree.root)).toEqual(expect.arrayContaining(['Delete README.md?']));

  const confirm = pressables(tree.root).reverse().find(node => texts(node).includes('Delete'));
  await settle(() => confirm.props.onPress());

  expect(fileSystem.deleteEntry).toHaveBeenCalledWith('/p', 'README.md');
  expect(onEntryRemoved).toHaveBeenCalledWith('README.md', false);
});
