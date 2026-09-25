import {Pressable, ScrollView, StyleSheet, Text} from 'react-native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {glass, useThemedStyles, withAlpha} from '../theme';

import {Field} from './ui';
import {FileIcon} from '../icons/FileIcon';
import {fileSystem} from '../fileSystem';
import {formatKeybinding} from './keymap';
import {fuzzyFilter} from './fuzzy';

/**
 * One overlay, several modes, told apart by the first character the way VS
 * Code does it: plain text finds files, `>` runs commands, `:` goes to a line,
 * `@` goes to a symbol. Arrow keys move, Enter runs, Escape closes.
 */
export function CommandPalette({visible, initialMode = 'files', projectRoot, commands, recentFiles = [], onClose, onOpenFile, onGoToLine, onGoToSymbol}) {
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (visible) {
      setQuery(initialMode === 'commands' ? '>' : initialMode === 'line' ? ':' : initialMode === 'symbol' ? '@' : '');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus?.(), 30);
    }
  }, [visible, initialMode]);

  const mode = query.startsWith('>') ? 'commands' : query.startsWith(':') ? 'line' : query.startsWith('@') ? 'symbol' : 'files';
  const text = mode === 'files' ? query : query.slice(1);

  useEffect(() => {
    if (!visible || mode !== 'files' || !projectRoot) {
      return undefined;
    }

    const id = ++requestId.current;

    if (!text.trim()) {
      setFiles(recentFiles.map(path => ({path})));
      return undefined;
    }

    const timer = setTimeout(() => {
      fileSystem
        .searchFiles(projectRoot, text.trim(), 'files')
        .then(response => {
          if (id === requestId.current) {
            setFiles(response.results ?? []);
            setSelected(0);
          }
        })
        .catch(() => {
          if (id === requestId.current) {
            setFiles([]);
          }
        });
    }, 120);

    return () => clearTimeout(timer);
  }, [visible, mode, text, projectRoot, recentFiles]);

  const items = useMemo(() => {
    if (mode === 'commands') {
      const list = commands ?? [];
      const matched = text.trim() ? fuzzyFilter(text, list, command => `${command.category ? `${command.category}: ` : ''}${command.label}`, 60).map(result => result.item) : list.slice(0, 60);
      return matched.map(command => ({key: command.id, kind: 'command', command}));
    }

    if (mode === 'files') {
      return files.map(file => ({key: file.path, kind: 'file', path: file.path}));
    }

    if (mode === 'line') {
      const line = Number.parseInt(text, 10);
      return Number.isFinite(line) && line > 0 ? [{key: 'line', kind: 'line', line, label: `Go to line ${line}`}] : [{key: 'line-hint', kind: 'hint', label: 'Type a line number'}];
    }

    return [{key: 'symbol', kind: 'symbol', label: 'Open symbol picker in the editor'}];
  }, [mode, text, commands, files]);

  useEffect(() => {
    setSelected(current => Math.min(current, Math.max(0, items.length - 1)));
  }, [items]);

  const run = useCallback(
    item => {
      if (!item || item.kind === 'hint') {
        return;
      }

      onClose?.();

      if (item.kind === 'command') {
        item.command.run?.();
      } else if (item.kind === 'file') {
        onOpenFile?.(item.path);
      } else if (item.kind === 'line') {
        onGoToLine?.(item.line);
      } else if (item.kind === 'symbol') {
        onGoToSymbol?.(text);
      }
    },
    [onClose, onOpenFile, onGoToLine, onGoToSymbol, text],
  );

  const onKeyPress = useCallback(
    event => {
      const key = event.nativeEvent.key;

      if (key === 'ArrowDown') {
        setSelected(current => Math.min(items.length - 1, current + 1));
      } else if (key === 'ArrowUp') {
        setSelected(current => Math.max(0, current - 1));
      } else if (key === 'Escape') {
        onClose?.();
      } else if (key === 'Enter') {
        run(items[selected]);
      }
    },
    [items, selected, onClose, run],
  );

  if (!visible) {
    return null;
  }

  return (
    <Pressable style={styles.backdrop} onPress={onClose} testID="palette-backdrop">
      <Pressable style={styles.palette} onPress={() => {}} testID="command-palette">
        <Field
          inputRef={inputRef}
          autoFocus
          value={query}
          onChangeText={value => {
            setQuery(value);
            setSelected(0);
          }}
          onKeyPress={onKeyPress}
          onSubmitEditing={() => run(items[selected])}
          placeholder="Search files by name; > for commands, : for a line, @ for a symbol"
          style={styles.input}
          testID="palette-input"
        />

        <ScrollView style={styles.list} keyboardShouldPersistTaps="always">
          {items.length === 0 && <Text style={styles.empty}>{mode === 'files' && !text ? 'No recent files' : 'No matches'}</Text>}

          {items.map((item, index) => (
            <Pressable
              key={item.key}
              onPress={() => run(item)}
              onHoverIn={() => setSelected(index)}
              style={[styles.item, index === selected && styles.itemSelected]}
              testID={`palette-item-${index}`}>
              {item.kind === 'file' && (
                <>
                  <FileIcon name={item.path.split('/').pop()} size={14} />
                  <Text style={styles.itemLabel} numberOfLines={1}>{item.path.split('/').pop()}</Text>
                  <Text style={styles.itemDetail} numberOfLines={1}>{item.path.includes('/') ? item.path.slice(0, item.path.lastIndexOf('/')) : ''}</Text>
                </>
              )}

              {item.kind === 'command' && (
                <>
                  <Text style={styles.itemLabel} numberOfLines={1}>
                    {item.command.category ? <Text style={styles.category}>{item.command.category}: </Text> : null}
                    {item.command.label}
                  </Text>
                  {item.command.keybinding ? <Text style={styles.keybinding}>{formatKeybinding(item.command.keybinding)}</Text> : null}
                </>
              )}

              {(item.kind === 'line' || item.kind === 'symbol' || item.kind === 'hint') && <Text style={styles.itemLabel}>{item.label}</Text>}
            </Pressable>
          ))}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: 60,
    zIndex: 100,
    backgroundColor: withAlpha('#000000', 0.15),
  },
  palette: {
    width: 620,
    maxWidth: '92%',
    maxHeight: 460,
    padding: 8,
    borderRadius: 14,
    ...glass(colors, {variant: 'surface'}),
    backgroundColor: colors.surface ?? withAlpha('#000', 0.6),
  },
  input: {
    fontSize: 14,
    paddingVertical: 8,
  },
  list: {
    marginTop: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  itemSelected: {
    backgroundColor: withAlpha(colors.primary, 0.3),
  },
  itemLabel: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 13,
  },
  itemDetail: {
    color: colors.onSurfaceVariant,
    fontSize: 11.5,
    maxWidth: '50%',
  },
  category: {
    color: colors.onSurfaceVariant,
  },
  keybinding: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  empty: {
    color: colors.onSurfaceVariant,
    fontSize: 12.5,
    padding: 10,
    textAlign: 'center',
  },
});
