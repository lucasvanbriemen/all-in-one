import {EmptyState, Field, IconButton, SmallButton} from './ui';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {glass, useThemedStyles, withAlpha} from '../theme';

import {FileIcon} from '../icons/FileIcon';
import {fileSystem} from '../fileSystem';

const DEBOUNCE_MS = 200;

/**
 * Search across the project: by file name, or through file contents with
 * every match shown on its line. Content results group by file and open at
 * the line. A replacement, when typed, applies to one file or to all of them.
 */
export function SearchSidebar({projectRoot, onOpenFile, onReplaced, onError, initialTerm = ''}) {
  const styles = useThemedStyles(createStyles);
  const [term, setTerm] = useState(initialTerm);
  const [mode, setMode] = useState('code');
  const [replacement, setReplacement] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [flags, setFlags] = useState({caseSensitive: false, wholeWord: false, regex: false});
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [excluded, setExcluded] = useState(() => new Set());
  const requestId = useRef(0);
  const inputRef = useRef(null);

  const search = useCallback(async () => {
    if (!projectRoot || !term) {
      setResults([]);
      return;
    }

    const id = ++requestId.current;
    setSearching(true);

    try {
      const response = await fileSystem.searchFiles(projectRoot, term, mode, flags);

      if (id === requestId.current) {
        setResults(response.results ?? []);
        setExcluded(new Set());
      }
    } catch (error) {
      if (id === requestId.current) {
        setResults([]);
        onError?.(error);
      }
    } finally {
      if (id === requestId.current) {
        setSearching(false);
      }
    }
  }, [projectRoot, term, mode, flags, onError]);

  useEffect(() => {
    const timer = setTimeout(search, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (initialTerm) {
      setTerm(initialTerm);
    }
  }, [initialTerm]);

  const grouped = useMemo(() => {
    if (mode !== 'code') {
      return [];
    }

    const byFile = new Map();
    for (const result of results) {
      if (!byFile.has(result.path)) {
        byFile.set(result.path, []);
      }
      byFile.get(result.path).push(result);
    }

    return [...byFile.entries()].map(([path, matches]) => ({path, matches}));
  }, [results, mode]);

  const replaceIn = useCallback(
    async paths => {
      if (!term) {
        return;
      }

      try {
        const outcome = await fileSystem.replace(projectRoot, term, replacement, {...flags, paths});
        onReplaced?.(outcome);
        search();
      } catch (error) {
        onError?.(error);
      }
    },
    [projectRoot, term, replacement, flags, onReplaced, onError, search],
  );

  const includedPaths = grouped.map(group => group.path).filter(path => !excluded.has(path));
  const totalMatches = grouped.reduce((sum, group) => sum + (excluded.has(group.path) ? 0 : group.matches.length), 0);

  const toggleFlag = flag => setFlags(current => ({...current, [flag]: !current[flag]}));

  return (
    <View style={styles.panel} testID="search-sidebar">
      <View style={styles.modes}>
        <ModeButton label="Contents" active={mode === 'code'} onPress={() => setMode('code')} styles={styles} />
        <ModeButton label="File names" active={mode === 'files'} onPress={() => setMode('files')} styles={styles} />
        {mode === 'code' && (
          <IconButton glyph={showReplace ? '▾' : '▸'} label="Toggle replace" onPress={() => setShowReplace(value => !value)} testID="search-toggle-replace" />
        )}
      </View>

      <View style={styles.inputRow}>
        <Field
          inputRef={inputRef}
          autoFocus
          value={term}
          onChangeText={setTerm}
          onSubmitEditing={search}
          placeholder={mode === 'code' ? 'Search in files' : 'Search file names'}
          style={styles.input}
          testID="search-input"
        />
        {mode === 'code' && (
          <View style={styles.flags}>
            <FlagButton label="Aa" tooltip="Match case" active={flags.caseSensitive} onPress={() => toggleFlag('caseSensitive')} styles={styles} />
            <FlagButton label="ab" tooltip="Whole word" active={flags.wholeWord} onPress={() => toggleFlag('wholeWord')} styles={styles} underline />
            <FlagButton label=".*" tooltip="Regular expression" active={flags.regex} onPress={() => toggleFlag('regex')} styles={styles} />
          </View>
        )}
      </View>

      {mode === 'code' && showReplace && (
        <View style={styles.inputRow}>
          <Field value={replacement} onChangeText={setReplacement} placeholder="Replace" style={styles.input} testID="replace-input" />
          <SmallButton
            title={`Replace all${totalMatches ? ` (${totalMatches})` : ''}`}
            tone="accent"
            disabled={!term || totalMatches === 0}
            onPress={() => replaceIn(includedPaths)}
            testID="replace-all"
          />
        </View>
      )}

      <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent}>
        {term && !searching && results.length === 0 && <EmptyState title="No results" hint={mode === 'code' ? 'Try fewer words, or turn off whole word.' : undefined} />}

        {mode === 'files' &&
          results.map(result => (
            <Pressable key={result.path} onPress={() => onOpenFile?.(result.path)} style={styles.fileRow} testID={`search-file-${result.path}`}>
              <FileIcon name={result.path.split('/').pop()} size={14} />
              <Text style={styles.fileName} numberOfLines={1}>{result.path.split('/').pop()}</Text>
              <Text style={styles.fileDirectory} numberOfLines={1}>{result.path.includes('/') ? result.path.slice(0, result.path.lastIndexOf('/')) : ''}</Text>
            </Pressable>
          ))}

        {mode === 'code' &&
          grouped.map(group => {
            const isCollapsed = collapsed.has(group.path);
            const isExcluded = excluded.has(group.path);

            return (
              <View key={group.path} style={[isExcluded && styles.excluded]}>
                <Pressable
                  onPress={() => setCollapsed(current => toggleIn(current, group.path))}
                  style={styles.fileRow}
                  testID={`search-group-${group.path}`}>
                  <Text style={styles.chevron}>{isCollapsed ? '▸' : '▾'}</Text>
                  <FileIcon name={group.path.split('/').pop()} size={14} />
                  <Text style={styles.fileName} numberOfLines={1}>{group.path.split('/').pop()}</Text>
                  <Text style={styles.fileDirectory} numberOfLines={1}>{group.path.includes('/') ? group.path.slice(0, group.path.lastIndexOf('/')) : ''}</Text>
                  <Text style={styles.count}>{group.matches.length}</Text>
                  {showReplace && <IconButton glyph="⇄" label="Replace in this file" size={12} onPress={() => replaceIn([group.path])} testID={`replace-file-${group.path}`} />}
                  <IconButton glyph={isExcluded ? '↺' : '✕'} label={isExcluded ? 'Include file' : 'Exclude file'} size={12} onPress={() => setExcluded(current => toggleIn(current, group.path))} />
                </Pressable>

                {!isCollapsed &&
                  group.matches.map(match => (
                    <Pressable
                      key={`${match.line}:${match.column}`}
                      onPress={() => onOpenFile?.(group.path, match.line, match.column)}
                      style={styles.matchRow}
                      testID={`search-match-${group.path}-${match.line}`}>
                      <Text style={styles.lineNumber}>{match.line}</Text>
                      <MatchPreview text={match.text} column={match.column} length={match.length ?? term.length} replacement={showReplace ? replacement : null} styles={styles} />
                    </Pressable>
                  ))}
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
}

function MatchPreview({text, column, length, replacement, styles}) {
  const start = Math.max(0, column - 1);
  const lead = Math.max(0, start - 40);
  const before = text.slice(lead, start);
  const match = text.slice(start, start + length);
  const after = text.slice(start + length, start + length + 80);

  return (
    <Text style={styles.preview} numberOfLines={1}>
      {lead > 0 ? '…' : ''}
      {before}
      <Text style={[styles.matchText, replacement !== null && styles.matchStruck]}>{match}</Text>
      {replacement !== null && <Text style={styles.replacementText}>{replacement}</Text>}
      {after}
    </Text>
  );
}

function ModeButton({label, active, onPress, styles}) {
  return (
    <Pressable onPress={onPress} style={[styles.mode, active && styles.modeActive]}>
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FlagButton({label, tooltip, active, onPress, styles, underline}) {
  return (
    <Pressable onPress={onPress} tooltip={tooltip} accessibilityLabel={tooltip} style={[styles.flag, active && styles.flagActive]}>
      <Text style={[styles.flagText, active && styles.flagTextActive, underline && {textDecorationLine: 'underline'}]}>{label}</Text>
    </Pressable>
  );
}

function toggleIn(set, value) {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

const createStyles = colors => StyleSheet.create({
  panel: {
    flex: 1,
    ...glass(colors, {variant: 'subtle'}),
    marginBottom: 16,
    marginTop: 16,
    padding: 10,
    borderRadius: 16,
    gap: 8,
  },
  modes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mode: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  modeActive: {
    ...glass(colors, {variant: 'accent'}),
  },
  modeText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  modeTextActive: {
    color: colors.onPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    flex: 1,
  },
  flags: {
    flexDirection: 'row',
    gap: 2,
  },
  flag: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagActive: {
    backgroundColor: withAlpha(colors.primary, 0.3),
  },
  flagText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: 'Menlo',
  },
  flagTextActive: {
    color: colors.onSurface,
  },
  results: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  chevron: {
    color: colors.onSurfaceVariant,
    width: 10,
    fontSize: 11,
  },
  fileName: {
    color: colors.onSurface,
    fontSize: 12.5,
    fontWeight: '600',
  },
  fileDirectory: {
    flex: 1,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  count: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    minWidth: 18,
    textAlign: 'center',
    borderRadius: 8,
    backgroundColor: withAlpha(colors.onSurface, 0.1),
    paddingHorizontal: 4,
  },
  excluded: {
    opacity: 0.4,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 24,
    paddingRight: 4,
    height: 22,
    borderRadius: 6,
  },
  lineNumber: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: 'Menlo',
    minWidth: 28,
    textAlign: 'right',
  },
  preview: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 12,
    fontFamily: 'Menlo',
  },
  matchText: {
    backgroundColor: withAlpha(colors.primary, 0.35),
    fontWeight: '600',
  },
  matchStruck: {
    textDecorationLine: 'line-through',
    backgroundColor: withAlpha('#f85149', 0.3),
  },
  replacementText: {
    backgroundColor: withAlpha('#3fb950', 0.3),
    fontWeight: '600',
  },
});
