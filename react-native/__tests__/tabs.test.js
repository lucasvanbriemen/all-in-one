import {disambiguate} from '../components/code/Tabs';
import {gitKind, gitLetter} from '../components/code/FileTree';

test('duplicate names show their folder', () => {
  expect(disambiguate(['src/a/index.js', 'src/b/index.js', 'README.md'])).toEqual({
    'src/a/index.js': 'a/index.js',
    'src/b/index.js': 'b/index.js',
    'README.md': 'README.md',
  });
  expect(disambiguate(['x/a/index.js', 'y/a/index.js'])).toEqual({
    'x/a/index.js': 'x/a/index.js',
    'y/a/index.js': 'y/a/index.js',
  });
});

test('git status letters map to kinds', () => {
  expect(gitKind({index: '?', worktree: '?'})).toBe('untracked');
  expect(gitKind({index: ' ', worktree: 'M'})).toBe('modified');
  expect(gitKind({index: 'A', worktree: ' '})).toBe('added');
  expect(gitKind({index: ' ', worktree: 'D'})).toBe('deleted');
  expect(gitKind({index: 'R', worktree: ' '})).toBe('renamed');
  expect(gitKind({index: 'U', worktree: 'U'})).toBe('conflict');
  expect(gitKind(null)).toBeNull();
  expect(gitLetter({index: ' ', worktree: 'M'})).toBe('M');
});
