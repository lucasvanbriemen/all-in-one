import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {glass, useTheme, useThemedStyles} from '../theme';

import {ChevronIcon} from '../icons';
import {fileSystem} from '../fileSystem';

/** The API addresses the working directory itself as the empty path. */
const ROOT = '';

/** Pixels a nesting level is worth. One chevron's width, so the rails line up. */
const INDENT = 14;

/** Every row is this tall, so `getItemLayout` can skip measuring them. */
const ROW_HEIGHT = 26;

function join(directory, name) {
  return directory ? `${directory}/${name}` : name;
}

/**
 * Directories first, then by name.
 *
 * The endpoint sorts by name alone, which interleaves `app/` with `Gemfile`.
 * Grouping the directories is what makes a deep tree scannable, and doing it
 * here keeps the ordering stable no matter which order the responses land in.
 */
function sortEntries(entries) {
  return [...entries].sort((first, second) => {
    if (first.isDirectory !== second.isDirectory) {
      return first.isDirectory ? -1 : 1;
    }

    return first.name.localeCompare(second.name);
  });
}

/**
 * The tree's state: which directories are open, and what is inside the ones
 * that have been looked at.
 *
 * Listing is per-directory, so the tree can only be built lazily — a node's
 * children are fetched the first time it is expanded and then cached, which is
 * also what lets a subtree be collapsed and reopened without another request.
 *
 * Expanding is the only thing a caller does; the fetch follows from it in an
 * effect rather than from the press handler. That keeps `expanded` the single
 * source of truth (the root is expanded from the start, so the first listing
 * happens for the same reason every other one does) and makes a double-press
 * impossible to turn into a double request.
 */
function useDirectoryTree() {
  const [children, setChildren] = useState({});
  const [expanded, setExpanded] = useState(() => new Set([ROOT]));
  const [loading, setLoading] = useState(() => new Set());

  // Paths already asked for. `children` can't stand in for this: the response
  // is what fills it, and until then the effect below would re-run on every
  // render and ask again.
  const requested = useRef(new Set());

  const toggle = useCallback(path => {
    setExpanded(current => {
      const next = new Set(current);

      if (!next.delete(path)) {
        next.add(path);
      }

      return next;
    });
  }, []);

  const collapse = useCallback(path => {
    setExpanded(current => {
      const next = new Set(current);
      next.delete(path);
      return next;
    });
  }, []);

  const mark = useCallback((path, isLoading) => {
    setLoading(current => {
      const next = new Set(current);

      if (isLoading) {
        next.add(path);
      } else {
        next.delete(path);
      }

      return next;
    });
  }, []);

  useEffect(() => {
    expanded.forEach(path => {
      if (children[path] !== undefined || requested.current.has(path)) {
        return;
      }

      requested.current.add(path);
      mark(path, true);

      fileSystem
        .listFiles(path)
        .then(response => {
          setChildren(current => ({...current, [path]: sortEntries(response.contents ?? [])}));
        })
        .catch(error => {
          console.error(error);

          // Left out of `children`, so the row collapsing back is enough for
          // another press to be a retry rather than a no-op.
          requested.current.delete(path);
          collapse(path);
        })
        .finally(() => mark(path, false));
    });
  }, [expanded, children, collapse, mark]);

  return {children, expanded, loading, toggle};
}

/**
 * The open parts of the tree, flattened into the row list.
 *
 * A tree renders as nested components far more naturally than as a flat list,
 * but a `node_modules` is 212 entries and nesting means mounting every one of
 * them. Flattening is what lets the rows go through a `FlatList`, so an
 * expanded directory costs a screenful of rows instead of all of them.
 *
 * Depth is carried on each row for the indent; the recursion is here rather
 * than in the rendering.
 */
function flatten(children, expanded, path = ROOT, depth = 0, rows = []) {
  const entries = children[path];

  if (!entries) {
    return rows;
  }

  if (!entries.length) {
    rows.push({key: `${path}/\u0000empty`, depth, isEmpty: true});
    return rows;
  }

  entries.forEach(entry => {
    const entryPath = join(path, entry.name);
    const isOpen = entry.isDirectory && expanded.has(entryPath);

    rows.push({key: entryPath, path: entryPath, entry, depth, isOpen});

    if (isOpen) {
      flatten(children, expanded, entryPath, depth + 1, rows);
    }
  });

  return rows;
}

function rowPadding(depth) {
  return 8 + depth * INDENT;
}

/**
 * Memoized, and handed its colours rather than calling `useTheme()` itself.
 * The palette arrives from a fetch, so a subscription per row means a row's
 * worth of state and one re-render each the moment it lands.
 */
const Row = React.memo(function Row({entry, depth, isOpen, isLoading, isSelected, onPress, colors, styles}) {
  const {onSurface, onSurfaceVariant, primary} = colors;
  const [hovered, setHovered] = useState(false);

  // Directories carry the full-strength colour and files the variant, so the
  // structure of the tree is legible before any of the names are read.
  const color = isSelected ? primary : entry.isDirectory ? onSurface : onSurfaceVariant;

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.row,
        {paddingLeft: rowPadding(depth)},
        hovered && styles.rowHovered,
        isSelected && styles.rowSelected,
        isLoading && styles.rowLoading,
      ]}>
      {/* Fixed-width gutter whether or not there is a chevron in it, so a
          file's icon sits under its siblings' rather than under their names. */}
      <View style={styles.twisty}>
        {entry.isDirectory && <ChevronIcon size={INDENT} color={color} open={isOpen} />}
      </View>

      <Text style={[styles.label, {color}]} numberOfLines={1}>
        {entry.name}
      </Text>
    </Pressable>
  );
});

/**
 * The working tree.
 *
 * Opening a file is the tree's job — it is the only thing that knows the path
 * a row stands for — but saving one is not, so the buffer only travels
 * outwards: the tree hands `CodePage` a path and its contents and is done.
 */
export function FileTree({currentFile, setCurrentFile, setSource}) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const tree = useDirectoryTree();

  const rows = useMemo(
    () => flatten(tree.children, tree.expanded),
    [tree.children, tree.expanded],
  );

  const onOpenFile = useCallback(
    path => {
      fileSystem
        .readFile(path)
        .then(response => {
          setSource(response.contents ?? '');
          setCurrentFile(path);
        })
        .catch(console.error);
    },
    [setCurrentFile, setSource],
  );

  const renderRow = useCallback(
    ({item}) => {
      if (item.isEmpty) {
        return <Text style={[styles.hint, {paddingLeft: rowPadding(item.depth)}]}>empty</Text>;
      }

      return (
        <Row
          entry={item.entry}
          depth={item.depth}
          isOpen={item.isOpen}
          isLoading={tree.loading.has(item.path)}
          isSelected={currentFile === item.path}
          onPress={() => (item.entry.isDirectory ? tree.toggle(item.path) : onOpenFile(item.path))}
          colors={colors}
          styles={styles}
        />
      );
    },
    [colors, currentFile, onOpenFile, styles, tree],
  );

  return (
    <View style={styles.panel}>
      <FlatList
        data={rows}
        renderItem={renderRow}
        keyExtractor={row => row.key}
        contentContainerStyle={styles.rows}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.hint}>Loading…</Text>}
        // Rows are a fixed height, so the list can place them without
        // measuring — which is what keeps scrolling a long directory smooth.
        getItemLayout={(_, index) => ({length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index})}
      />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  panel: {
    ...glass(colors, {tint: 0.25}),
    marginBottom: 16,
    marginTop: 16,
    borderRadius: 16,
    flex: 1,
    overflow: 'hidden',
  },
  rows: {
    paddingBottom: 8,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: ROW_HEIGHT,
    paddingRight: 8,
    borderRadius: 6,
    marginLeft: 4,
    marginRight: 4,
  },
  rowHovered: {
    ...glass(colors, {tone: 'surfaceAt3', border: 0, highlight: 0}),
    borderWidth: 0,
  },
  rowSelected: {
    ...glass(colors, {tone: 'primary', tint: 0.16, border: 0, highlight: 0}),
    borderWidth: 0,
  },
  rowLoading: {
    opacity: 0.5,
  },
  twisty: {
    width: INDENT,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    flexShrink: 1,
  },
  hint: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    height: ROW_HEIGHT,
    lineHeight: ROW_HEIGHT,
    paddingLeft: 8,
    opacity: 0.7,
  },
});
