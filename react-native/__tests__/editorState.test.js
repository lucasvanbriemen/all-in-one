import {
  activeFile,
  activeGroup,
  editorReducer,
  initialEditorState,
  openPaths,
  serializeEditorState,
} from '../components/code/editorState';

const reduce = (state, ...actions) => actions.reduce(editorReducer, state);

test('opening files adds tabs and activates the latest', () => {
  const state = reduce(initialEditorState(), {type: 'open', path: 'a.js'}, {type: 'open', path: 'b.js'}, {type: 'open', path: 'a.js'});
  expect(activeGroup(state).tabs).toEqual(['a.js', 'b.js']);
  expect(activeFile(state)).toBe('a.js');
});

test('opening in the background keeps the current file', () => {
  const state = reduce(initialEditorState(), {type: 'open', path: 'a.js'}, {type: 'open', path: 'b.js', background: true});
  expect(activeFile(state)).toBe('a.js');
  expect(activeGroup(state).tabs).toEqual(['a.js', 'b.js']);
});

test('closing the active tab moves to the neighbour on the right, then left', () => {
  let state = reduce(initialEditorState(), {type: 'open', path: 'a.js'}, {type: 'open', path: 'b.js'}, {type: 'open', path: 'c.js'}, {type: 'activate', path: 'b.js'});
  state = editorReducer(state, {type: 'close', path: 'b.js'});
  expect(activeFile(state)).toBe('c.js');
  state = editorReducer(state, {type: 'close', path: 'c.js'});
  expect(activeFile(state)).toBe('a.js');
  state = editorReducer(state, {type: 'close', path: 'a.js'});
  expect(activeFile(state)).toBeNull();
  expect(state.groups).toHaveLength(1);
});

test('closing a background tab leaves the active one alone', () => {
  let state = reduce(initialEditorState(), {type: 'open', path: 'a.js'}, {type: 'open', path: 'b.js'});
  state = editorReducer(state, {type: 'close', path: 'a.js'});
  expect(activeFile(state)).toBe('b.js');
});

test('close others and close all', () => {
  const opened = reduce(initialEditorState(), {type: 'open', path: 'a.js'}, {type: 'open', path: 'b.js'}, {type: 'open', path: 'c.js'});
  expect(activeGroup(editorReducer(opened, {type: 'closeOthers', path: 'b.js'})).tabs).toEqual(['b.js']);
  expect(activeGroup(editorReducer(opened, {type: 'closeAll'})).tabs).toEqual([]);
});

test('tabs cycle with next and previous', () => {
  let state = reduce(initialEditorState(), {type: 'open', path: 'a.js'}, {type: 'open', path: 'b.js'}, {type: 'open', path: 'c.js'});
  state = editorReducer(state, {type: 'next'});
  expect(activeFile(state)).toBe('a.js');
  state = editorReducer(state, {type: 'previous'});
  expect(activeFile(state)).toBe('c.js');
});

test('tabs can be reordered and clamp to the ends', () => {
  let state = reduce(initialEditorState(), {type: 'open', path: 'a.js'}, {type: 'open', path: 'b.js'}, {type: 'open', path: 'c.js'});
  state = editorReducer(state, {type: 'move', path: 'c.js', to: 0});
  expect(activeGroup(state).tabs).toEqual(['c.js', 'a.js', 'b.js']);
  state = editorReducer(state, {type: 'move', path: 'c.js', to: 99});
  expect(activeGroup(state).tabs).toEqual(['a.js', 'b.js', 'c.js']);
});

test('split copies the active file and unsplit merges without duplicates', () => {
  let state = reduce(initialEditorState(), {type: 'open', path: 'a.js'}, {type: 'open', path: 'b.js'});
  state = editorReducer(state, {type: 'split'});
  expect(state.groups).toHaveLength(2);
  expect(activeGroup(state).tabs).toEqual(['b.js']);
  expect(editorReducer(state, {type: 'split'}).groups).toHaveLength(2);

  state = editorReducer(state, {type: 'open', path: 'c.js'});
  expect(openPaths(state)).toEqual(['a.js', 'b.js', 'c.js']);

  state = editorReducer(state, {type: 'unsplit'});
  expect(state.groups).toHaveLength(1);
  expect(state.groups[0].tabs).toEqual(['a.js', 'b.js', 'c.js']);
  expect(activeFile(state)).toBe('c.js');
});

test('an emptied second group collapses back into one', () => {
  let state = reduce(initialEditorState(), {type: 'open', path: 'a.js'}, {type: 'split'});
  const second = state.activeGroup;
  state = editorReducer(state, {type: 'close', path: 'a.js', groupId: second});
  expect(state.groups).toHaveLength(1);
  expect(activeFile(state)).toBe('a.js');
});

test('moving a tab to the other group', () => {
  let state = reduce(initialEditorState(), {type: 'open', path: 'a.js'}, {type: 'open', path: 'b.js'}, {type: 'split'});
  const [first, second] = state.groups.map(group => group.id);
  state = editorReducer(state, {type: 'moveToGroup', path: 'a.js', groupId: second});
  expect(state.groups.find(g => g.id === first).tabs).toEqual(['b.js']);
  expect(state.groups.find(g => g.id === second).tabs).toEqual(['b.js', 'a.js']);
  expect(activeFile(state)).toBe('a.js');
});

test('renames follow the file, and folders carry their children', () => {
  let state = reduce(initialEditorState(), {type: 'open', path: 'src/a.js'}, {type: 'open', path: 'src/deep/b.js'});
  state = editorReducer(state, {type: 'rename', from: 'src/a.js', to: 'src/z.js'});
  expect(activeGroup(state).tabs).toEqual(['src/z.js', 'src/deep/b.js']);
  state = editorReducer(state, {type: 'renameFolder', from: 'src', to: 'lib'});
  expect(activeGroup(state).tabs).toEqual(['lib/z.js', 'lib/deep/b.js']);
  expect(activeFile(state)).toBe('lib/deep/b.js');
});

test('a deleted file closes everywhere', () => {
  let state = reduce(initialEditorState(), {type: 'open', path: 'a.js'}, {type: 'open', path: 'b.js'}, {type: 'split'});
  state = editorReducer(state, {type: 'closeEverywhere', path: 'b.js'});
  expect(state.groups).toHaveLength(1);
  expect(activeGroup(state).tabs).toEqual(['a.js']);
});

test('serialise and restore round-trip by position', () => {
  let state = reduce(initialEditorState(), {type: 'open', path: 'a.js'}, {type: 'open', path: 'b.js'}, {type: 'split'}, {type: 'open', path: 'c.js'});
  const saved = JSON.parse(JSON.stringify(serializeEditorState(state)));
  expect(saved).toEqual({groups: [{tabs: ['a.js', 'b.js'], active: 'b.js'}, {tabs: ['b.js', 'c.js'], active: 'c.js'}], activeIndex: 1});

  const restored = editorReducer(initialEditorState(), {type: 'restore', ...saved});
  expect(restored.groups.map(group => group.tabs)).toEqual([['a.js', 'b.js'], ['b.js', 'c.js']]);
  expect(activeFile(restored)).toBe('c.js');

  expect(editorReducer(initialEditorState(), {type: 'restore', groups: [{tabs: []}]}).groups).toHaveLength(1);
});
