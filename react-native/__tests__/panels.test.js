import {countProblems} from '../components/code/ProblemsPanel';
import {mergeSettings, DEFAULT_SETTINGS} from '../components/code/settings';
import {relativeDate} from '../components/code/GitSidebar';

test('countProblems tallies errors and warnings across files', () => {
  expect(countProblems({
    'a.js': [{severity: 'error'}, {severity: 'warning'}, {severity: 'info'}],
    'b.js': [{severity: 'error'}],
  })).toEqual({errors: 2, warnings: 1, total: 3});
  expect(countProblems(null)).toEqual({errors: 0, warnings: 0, total: 0});
});

test('mergeSettings fills gaps and keeps keybindings separate', () => {
  const merged = mergeSettings({fontSize: 18, keybindings: {save: 'cmd+shift+s'}});
  expect(merged.fontSize).toBe(18);
  expect(merged.tabSize).toBe(DEFAULT_SETTINGS.tabSize);
  expect(merged.keybindings).toEqual({save: 'cmd+shift+s'});
  expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
});

test('relativeDate rounds to the largest unit', () => {
  const now = new Date('2026-09-19T12:00:00Z').getTime();
  expect(relativeDate('2026-09-19T11:59:30Z', now)).toBe('just now');
  expect(relativeDate('2026-09-19T11:30:00Z', now)).toBe('30m ago');
  expect(relativeDate('2026-09-17T12:00:00Z', now)).toBe('2d ago');
  expect(relativeDate('nope', now)).toBe('');
});
