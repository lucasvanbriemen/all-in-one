import {IconButton} from './ui';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {glass, useThemedStyles, withAlpha} from '../theme';

import {Terminal} from './Terminal';

/**
 * Several shells, one showing. Every terminal stays mounted so its scrollback
 * and running job survive a switch; the ones not showing are hidden, and told
 * to re-measure when shown again because a hidden panel has no size.
 */
export function TerminalPanel({projectRoot, terminals, activeId, onActivate, onAdd, onClose, onRename, onCollapse, appKeys, sources, serverUp, onCommand, style}) {
  const styles = useThemedStyles(createStyles);
  const refs = useRef({});
  const [titles, setTitles] = useState({});

  useEffect(() => {
    // A terminal that was hidden has been laid out at zero; fit it now.
    setTimeout(() => refs.current[activeId]?.fit?.(), 50);
  }, [activeId]);

  return (
    <View style={[styles.panel, style]} testID="terminal-panel">
      <View style={styles.bar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {terminals.map((terminal, index) => (
            <TerminalTab
              key={terminal.id}
              title={titles[terminal.id] ?? terminal.title ?? `shell ${index + 1}`}
              isActive={terminal.id === activeId}
              onPress={() => onActivate(terminal.id)}
              onClose={() => onClose(terminal.id)}
              styles={styles}
              testID={`terminal-tab-${terminal.id}`}
            />
          ))}
        </ScrollView>

        <IconButton glyph="＋" label="New terminal" onPress={onAdd} testID="terminal-add" />
        <IconButton glyph="⌄" label="Hide terminal" onPress={onCollapse} testID="terminal-collapse" />
      </View>

      <View style={styles.body}>
        {terminals.map(terminal => (
          <View key={terminal.id} style={[styles.terminal, terminal.id !== activeId && styles.hidden]}>
            <Terminal
              ref={instance => {
                refs.current[terminal.id] = instance;
              }}
              projectRoot={projectRoot}
              appKeys={appKeys}
              sources={sources}
              serverUp={serverUp}
              onCommand={onCommand}
              onTitle={title => setTitles(current => (current[terminal.id] === title ? current : {...current, [terminal.id]: title}))}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function TerminalTab({title, isActive, onPress, onClose, styles, testID}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} style={[styles.tab, isActive && styles.tabActive]} testID={testID}>
      <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>{title}</Text>
      <IconButton glyph="×" label="Close terminal" size={14} onPress={onClose} style={[!hovered && !isActive && styles.closeHidden]} />
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  panel: {
    borderRadius: 16,
    overflow: 'hidden',
    ...glass(colors, {variant: 'subtle'}),
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 4,
    height: 32,
  },
  tabs: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    paddingLeft: 10,
    paddingRight: 2,
    borderRadius: 8,
    maxWidth: 200,
  },
  tabActive: {
    backgroundColor: withAlpha(colors.primary, 0.25),
  },
  tabText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  tabTextActive: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  closeHidden: {
    opacity: 0,
  },
  body: {
    flex: 1,
  },
  terminal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hidden: {
    display: 'none',
  },
});
