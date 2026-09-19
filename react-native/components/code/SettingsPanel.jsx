import {DEFAULT_KEYBINDINGS, DEFAULT_SETTINGS} from './settings';
import {Field, IconButton, SectionTitle, SmallButton, Toggle} from './ui';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useState} from 'react';
import {formatKeybinding, parseKeybinding} from './keymap';
import {glass, useThemedStyles, withAlpha} from '../theme';

/** Command ids as the settings screen labels them. */
export const COMMAND_LABELS = {
  quickOpen: 'Go to file',
  commandPalette: 'Command palette',
  goToSymbol: 'Go to symbol in file',
  goToLine: 'Go to line',
  save: 'Save',
  saveAll: 'Save all',
  closeTab: 'Close tab',
  closeAllTabs: 'Close all tabs',
  reopenClosedTab: 'Reopen closed tab',
  nextTab: 'Next tab',
  previousTab: 'Previous tab',
  nextTabAlt: 'Next tab (alternate)',
  previousTabAlt: 'Previous tab (alternate)',
  splitEditor: 'Split editor',
  focusFirstGroup: 'Focus first editor group',
  focusSecondGroup: 'Focus second editor group',
  toggleSidebar: 'Toggle sidebar',
  toggleTerminal: 'Toggle terminal',
  newTerminal: 'New terminal',
  showFiles: 'Show files',
  showSearch: 'Search in files',
  showGit: 'Show source control',
  showProblems: 'Show problems',
  openSettings: 'Open settings',
  openFolder: 'Open folder',
  newFile: 'New file',
  formatDocument: 'Format document',
  toggleWordWrap: 'Toggle word wrap',
  zoomIn: 'Increase font size',
  zoomOut: 'Decrease font size',
  dismiss: 'Dismiss / close overlay',
};

/**
 * The editor's settings and keybindings, edited in place. Every change is
 * applied immediately and saved; there is no OK button.
 */
export function SettingsPanel({settings, onChange, onReset}) {
  const styles = useThemedStyles(createStyles);
  const [filter, setFilter] = useState('');

  const set = (key, value) => onChange?.({[key]: value});
  const setKey = (command, text) => onChange?.({keybindings: {...settings.keybindings, [command]: text}});

  const commands = Object.keys(DEFAULT_KEYBINDINGS).filter(command => {
    if (!filter) {
      return true;
    }
    const label = COMMAND_LABELS[command] ?? command;
    return label.toLowerCase().includes(filter.toLowerCase()) || command.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <View style={styles.panel} testID="settings-panel">
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <SmallButton title="Reset all" onPress={onReset} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionTitle title="Editor" />

        <Stepper label="Font size" value={settings.fontSize} min={8} max={40} onChange={value => set('fontSize', value)} styles={styles} testID="setting-fontSize" />
        <Stepper label="Tab size" value={settings.tabSize} min={1} max={8} onChange={value => set('tabSize', value)} styles={styles} />

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Font family</Text>
          <Field value={settings.fontFamily} onChangeText={value => set('fontFamily', value)} placeholder="Menlo, Monaco, monospace" style={styles.fieldInput} />
        </View>

        <Toggle label="Insert spaces" description="Tab key inserts spaces rather than a tab character" value={settings.insertSpaces} onChange={value => set('insertSpaces', value)} />
        <Toggle label="Word wrap" value={settings.wordWrap} onChange={value => set('wordWrap', value)} />
        <Toggle label="Minimap" value={settings.minimap} onChange={value => set('minimap', value)} />
        <Toggle label="Line numbers" value={settings.lineNumbers} onChange={value => set('lineNumbers', value)} />
        <Toggle label="Sticky scroll" description="Keep the enclosing scope pinned at the top" value={settings.stickyScroll} onChange={value => set('stickyScroll', value)} />
        <Toggle label="Bracket pair colours" value={settings.bracketPairColorization} onChange={value => set('bracketPairColorization', value)} />
        <Toggle label="Bracket pair guides" value={settings.bracketPairGuides} onChange={value => set('bracketPairGuides', value)} />
        <Toggle label="Indent guides" value={settings.indentGuides} onChange={value => set('indentGuides', value)} />
        <Toggle
          label="Render whitespace"
          description={settings.renderWhitespace === 'all' ? 'Always' : 'Only in selections'}
          value={settings.renderWhitespace === 'all'}
          onChange={value => set('renderWhitespace', value ? 'all' : 'selection')}
        />

        <SectionTitle title="Saving" />
        <Toggle label="Auto save" description="Write the file shortly after you stop typing, and on blur" value={settings.autoSave} onChange={value => set('autoSave', value)} />
        {settings.autoSave && <Stepper label="Auto save delay (ms)" value={settings.autoSaveDelay} min={100} max={5000} step={100} onChange={value => set('autoSaveDelay', value)} styles={styles} />}
        <Toggle label="Format on save" description="Runs the language's formatter when one is available" value={settings.formatOnSave} onChange={value => set('formatOnSave', value)} />
        <Toggle label="Format on paste" value={settings.formatOnPaste} onChange={value => set('formatOnPaste', value)} />

        <SectionTitle title="Terminal" />
        <Stepper label="Terminal font size" value={settings.terminalFontSize} min={8} max={32} onChange={value => set('terminalFontSize', value)} styles={styles} />

        <SectionTitle
          title="Keyboard shortcuts"
          right={<SmallButton title="Reset" onPress={() => onChange?.({keybindings: {}})} />}
        />
        <Text style={styles.help}>Type a binding like cmd+shift+p, ctrl+`, or alt+z. Leave it empty to unbind.</Text>
        <Field value={filter} onChangeText={setFilter} placeholder="Filter commands" style={styles.filter} />

        {commands.map(command => {
          const text = settings.keybindings[command] ?? DEFAULT_KEYBINDINGS[command];
          const isDefault = settings.keybindings[command] === undefined;
          const valid = text === '' || parseKeybinding(text) !== null;

          return (
            <View key={command} style={styles.keyRow} testID={`keybinding-${command}`}>
              <Text style={styles.keyLabel} numberOfLines={1}>{COMMAND_LABELS[command] ?? command}</Text>
              <Text style={styles.keyGlyphs}>{valid ? formatKeybinding(text) : '?'}</Text>
              <Field
                value={text}
                onChangeText={value => setKey(command, value)}
                monospace
                style={[styles.keyInput, !valid && styles.keyInvalid]}
                testID={`keybinding-input-${command}`}
              />
              {!isDefault && <IconButton glyph="↺" label="Reset to default" onPress={() => {
                const next = {...settings.keybindings};
                delete next[command];
                onChange?.({keybindings: next});
              }} />}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Stepper({label, value, min, max, step = 1, onChange, styles, testID}) {
  const clamp = next => Math.max(min, Math.min(max, next));

  return (
    <View style={styles.fieldRow} testID={testID}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepper}>
        <IconButton glyph="−" label={`Decrease ${label}`} onPress={() => onChange(clamp(value - step))} testID={testID ? `${testID}-decrease` : undefined} />
        <Text style={styles.stepperValue}>{value}</Text>
        <IconButton glyph="＋" label={`Increase ${label}`} onPress={() => onChange(clamp(value + step))} testID={testID ? `${testID}-increase` : undefined} />
      </View>
    </View>
  );
}

export {DEFAULT_SETTINGS};

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
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  title: {
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  scroll: {flex: 1},
  content: {paddingHorizontal: 12, paddingBottom: 16},
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 8,
  },
  fieldLabel: {
    color: colors.onSurface,
    fontSize: 13,
  },
  fieldInput: {
    flex: 1,
    maxWidth: 220,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  stepperValue: {
    color: colors.onSurface,
    fontSize: 13,
    fontFamily: 'Menlo',
    minWidth: 40,
    textAlign: 'center',
  },
  help: {
    color: colors.onSurfaceVariant,
    fontSize: 11.5,
    marginBottom: 6,
  },
  filter: {
    marginBottom: 6,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  keyLabel: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 12.5,
  },
  keyGlyphs: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    minWidth: 48,
    textAlign: 'right',
  },
  keyInput: {
    width: 130,
    paddingVertical: 3,
    fontSize: 12,
  },
  keyInvalid: {
    borderColor: '#f85149',
    backgroundColor: withAlpha('#f85149', 0.15),
  },
});
