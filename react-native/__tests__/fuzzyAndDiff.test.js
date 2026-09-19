import {fuzzyFilter, fuzzyMatch} from '../components/code/fuzzy';
import {gutterChanges, lineDiff, splitLines} from '../components/code/lineDiff';

test('fuzzy match requires every character in order', () => {
  expect(fuzzyMatch('abc', 'xaxbxc')).toBeTruthy();
  expect(fuzzyMatch('acb', 'abc')).toBeNull();
  expect(fuzzyMatch('', 'anything').score).toBe(1);
});

test('fuzzy prefers exact, then substring at a boundary, then scattered', () => {
  const exact = fuzzyMatch('save', 'save').score;
  const boundary = fuzzyMatch('save', 'file: save').score;
  const inside = fuzzyMatch('save', 'unsaved').score;
  const scattered = fuzzyMatch('save', 'select a view entry').score;
  expect(exact).toBeGreaterThan(boundary);
  expect(boundary).toBeGreaterThan(inside);
  expect(inside).toBeGreaterThan(scattered);
});

test('fuzzyFilter sorts and limits', () => {
  const commands = ['Close Tab', 'Close All Tabs', 'Toggle Terminal', 'Save', 'Save All'];
  const results = fuzzyFilter('cl', commands);
  expect(results.map(result => result.item)).toEqual(['Close Tab', 'Close All Tabs']);
  expect(fuzzyFilter('a', commands, item => item, 2)).toHaveLength(2);
});

test('splitLines treats a trailing newline as the end of the last line', () => {
  expect(splitLines('a\nb\n')).toEqual(['a', 'b']);
  expect(splitLines('a\nb')).toEqual(['a', 'b']);
  expect(splitLines('')).toEqual(['']);
});

test('lineDiff reports insertions, deletions and modifications', () => {
  expect(lineDiff('a\nb\nc\n', 'a\nb\nc\n')).toEqual([]);

  expect(lineDiff('a\nb\nc\n', 'a\nb\nx\nc\n')).toEqual([
    {originalStart: 2, originalLength: 0, modifiedStart: 2, modifiedLength: 1},
  ]);

  expect(lineDiff('a\nb\nc\n', 'a\nc\n')).toEqual([
    {originalStart: 1, originalLength: 1, modifiedStart: 1, modifiedLength: 0},
  ]);

  expect(lineDiff('a\nb\nc\n', 'a\nB\nc\n')).toEqual([
    {originalStart: 1, originalLength: 1, modifiedStart: 1, modifiedLength: 1},
  ]);
});

test('lineDiff finds separate hunks in the middle', () => {
  const original = ['one', 'two', 'three', 'four', 'five', 'six'].join('\n');
  const modified = ['one', 'TWO', 'three', 'four', 'four-and-a-half', 'five'].join('\n');
  const hunks = lineDiff(original, modified);

  expect(hunks).toEqual([
    {originalStart: 1, originalLength: 1, modifiedStart: 1, modifiedLength: 1},
    {originalStart: 4, originalLength: 0, modifiedStart: 4, modifiedLength: 1},
    {originalStart: 5, originalLength: 1, modifiedStart: 6, modifiedLength: 0},
  ]);

  expect(gutterChanges(hunks)).toEqual([
    {kind: 'modified', startLine: 2, endLine: 2},
    {kind: 'added', startLine: 5, endLine: 5},
    {kind: 'deleted', startLine: 6, endLine: 6},
  ]);
});

test('lineDiff handles empty originals (a new file) and empty buffers', () => {
  expect(gutterChanges(lineDiff('', 'a\nb\n'))).toEqual([{kind: 'modified', startLine: 1, endLine: 2}]);
  expect(gutterChanges(lineDiff('a\nb\n', ''))).toEqual([{kind: 'modified', startLine: 1, endLine: 1}]);
});

test('lineDiff is exact on a large file with a single edit', () => {
  const lines = Array.from({length: 5000}, (_, index) => `line ${index}`);
  const modified = [...lines];
  modified[2500] = 'changed';
  const hunks = lineDiff(lines.join('\n'), modified.join('\n'));
  expect(hunks).toEqual([{originalStart: 2500, originalLength: 1, modifiedStart: 2500, modifiedLength: 1}]);
});
