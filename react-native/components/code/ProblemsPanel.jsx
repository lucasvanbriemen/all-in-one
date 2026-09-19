import {EmptyState, SEVERITY_COLORS} from './ui';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useMemo} from 'react';
import {glass, useThemedStyles, withAlpha} from '../theme';

import {FileIcon} from '../icons/FileIcon';

const GLYPH = {error: '⨯', warning: '⚠', info: 'ℹ', hint: '·'};
const ORDER = {error: 0, warning: 1, info: 2, hint: 3};

/**
 * Every diagnostic the editors currently know about, grouped by file and
 * sorted by severity then line. From Monaco's own workers and from the
 * language servers alike; a click goes to the line.
 */
export function ProblemsPanel({diagnostics, onOpen}) {
  const styles = useThemedStyles(createStyles);

  const groups = useMemo(() => {
    return Object.entries(diagnostics ?? {})
      .filter(([, list]) => list.length > 0)
      .map(([path, list]) => ({
        path,
        list: [...list].sort((a, b) => (ORDER[a.severity] ?? 9) - (ORDER[b.severity] ?? 9) || a.line - b.line),
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [diagnostics]);

  const counts = useMemo(() => countProblems(diagnostics), [diagnostics]);

  return (
    <View style={styles.panel} testID="problems-panel">
      <View style={styles.header}>
        <Text style={styles.title}>Problems</Text>
        <Text style={[styles.count, {color: SEVERITY_COLORS.error}]}>{GLYPH.error} {counts.errors}</Text>
        <Text style={[styles.count, {color: SEVERITY_COLORS.warning}]}>{GLYPH.warning} {counts.warnings}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {groups.length === 0 && <EmptyState title="No problems" hint="Diagnostics from open files show up here." />}

        {groups.map(group => (
          <View key={group.path}>
            <View style={styles.fileRow}>
              <FileIcon name={group.path.split('/').pop()} size={14} />
              <Text style={styles.fileName}>{group.path.split('/').pop()}</Text>
              <Text style={styles.directory} numberOfLines={1}>{group.path.includes('/') ? group.path.slice(0, group.path.lastIndexOf('/')) : ''}</Text>
              <Text style={styles.fileCount}>{group.list.length}</Text>
            </View>

            {group.list.map((problem, index) => (
              <Pressable
                key={`${problem.line}:${problem.column}:${index}`}
                onPress={() => onOpen?.(group.path, problem.line, problem.column)}
                style={styles.problem}
                testID={`problem-${group.path}-${problem.line}`}>
                <Text style={[styles.glyph, {color: SEVERITY_COLORS[problem.severity] ?? SEVERITY_COLORS.hint}]}>{GLYPH[problem.severity] ?? '·'}</Text>
                <Text style={styles.message} numberOfLines={2}>
                  {problem.message}
                  {problem.source ? <Text style={styles.source}>  {problem.source}</Text> : null}
                  <Text style={styles.position}>  [{problem.line}, {problem.column}]</Text>
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function countProblems(diagnostics) {
  let errors = 0;
  let warnings = 0;

  for (const list of Object.values(diagnostics ?? {})) {
    for (const problem of list) {
      if (problem.severity === 'error') {
        errors++;
      } else if (problem.severity === 'warning') {
        warnings++;
      }
    }
  }

  return {errors, warnings, total: errors + warnings};
}

const createStyles = colors => StyleSheet.create({
  panel: {
    flex: 1,
    ...glass(colors, {variant: 'subtle'}),
    marginBottom: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  title: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
  },
  scroll: {flex: 1},
  content: {paddingHorizontal: 8, paddingBottom: 8},
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
    paddingHorizontal: 4,
  },
  fileName: {
    color: colors.onSurface,
    fontSize: 12.5,
    fontWeight: '600',
  },
  directory: {
    flex: 1,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  fileCount: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    backgroundColor: withAlpha(colors.onSurface, 0.1),
    borderRadius: 8,
    paddingHorizontal: 5,
  },
  problem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 3,
    borderRadius: 6,
  },
  glyph: {
    fontSize: 12,
    width: 14,
    textAlign: 'center',
  },
  message: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 12,
  },
  source: {
    color: colors.onSurfaceVariant,
  },
  position: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
});
