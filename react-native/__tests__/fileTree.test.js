import {flattenTree} from '../components/code/useFileTree';

test('flattenTree lists expanded folders in order with depth', () => {
  const children = {
    '': [
      {name: 'src', isDirectory: true, fullPath: 'src'},
      {name: 'README.md', isDirectory: false, fullPath: 'README.md'},
    ],
    src: [
      {name: 'deep', isDirectory: true, fullPath: 'src/deep'},
      {name: 'a.js', isDirectory: false, fullPath: 'src/a.js'},
    ],
    'src/deep': [{name: 'b.js', isDirectory: false, fullPath: 'src/deep/b.js'}],
  };

  const collapsed = flattenTree(children, new Set());
  expect(collapsed.map(row => row.fullPath)).toEqual(['src', 'README.md']);

  const open = flattenTree(children, new Set(['src']));
  expect(open.map(row => [row.fullPath, row.depth])).toEqual([['src', 0], ['src/deep', 1], ['src/a.js', 1], ['README.md', 0]]);
  expect(open[0].isOpen).toBe(true);

  const deep = flattenTree(children, new Set(['src', 'src/deep']));
  expect(deep.map(row => row.fullPath)).toEqual(['src', 'src/deep', 'src/deep/b.js', 'src/a.js', 'README.md']);
});
