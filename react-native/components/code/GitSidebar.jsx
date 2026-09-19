import {EmptyState, Field, GIT_COLORS, IconButton, SectionTitle, SmallButton} from './ui';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {glass, useThemedStyles, withAlpha} from '../theme';

import {FileIcon} from '../icons/FileIcon';
import {fileSystem} from '../fileSystem';
import {gitKind, gitLetter} from './FileTree';

/**
 * Source control, the everyday subset: the branch, what is staged and what
 * is not, stage and unstage per file or all at once, discard, commit, and
 * the last few commits. Clicking a change shows its diff in the editor.
 */
export function GitSidebar({projectRoot, git, onRefresh, onOpenFile, onShowDiff, diffPath, onError, onNotice}) {
  const styles = useThemedStyles(createStyles);
  const [message, setMessage] = useState('');
  const [amend, setAmend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(null);
  const [showBranches, setShowBranches] = useState(false);
  const [branches, setBranches] = useState([]);
  const [newBranch, setNewBranch] = useState('');
  const [showLog, setShowLog] = useState(true);
  const [log, setLog] = useState([]);

  const run = useCallback(
    async (work, notice) => {
      setBusy(true);
      try {
        await work();
        if (notice) {
          onNotice?.(notice);
        }
        await onRefresh?.();
      } catch (error) {
        onError?.(error);
      } finally {
        setBusy(false);
      }
    },
    [onRefresh, onError, onNotice],
  );

  useEffect(() => {
    if (!projectRoot || !git?.repository) {
      setLog([]);
      return;
    }

    fileSystem.git.log(projectRoot, 20).then(response => setLog(response.commits ?? [])).catch(() => setLog([]));
  }, [projectRoot, git]);

  const loadBranches = useCallback(async () => {
    try {
      const response = await fileSystem.git.branches(projectRoot);
      setBranches(response.branches ?? []);
    } catch (error) {
      onError?.(error);
    }
  }, [projectRoot, onError]);

  if (!projectRoot) {
    return (
      <View style={styles.panel}>
        <EmptyState title="No folder open" />
      </View>
    );
  }

  if (git && git.repository === false) {
    return (
      <View style={styles.panel}>
        <EmptyState title="Not a git repository" hint="Run git init in the terminal to start tracking this folder." />
      </View>
    );
  }

  const changes = git?.changes ?? [];
  const staged = changes.filter(change => change.index !== ' ' && change.index !== '?');
  const unstaged = changes.filter(change => change.worktree !== ' ' || change.index === '?');

  const commit = () =>
    run(async () => {
      await fileSystem.git.commit(projectRoot, message, amend);
      setMessage('');
      setAmend(false);
    }, amend ? 'Commit amended' : 'Committed');

  return (
    <View style={styles.panel} testID="git-sidebar">
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            setShowBranches(open => !open);
            if (!showBranches) {
              loadBranches();
            }
          }}
          style={styles.branch}
          testID="git-branch">
          <Text style={styles.branchGlyph}>⎇</Text>
          <Text style={styles.branchName} numberOfLines={1}>{git?.branch ?? '…'}</Text>
          <Text style={styles.chevron}>{showBranches ? '▾' : '▸'}</Text>
        </Pressable>
        <IconButton glyph="⟳" label="Refresh" onPress={onRefresh} />
      </View>

      {showBranches && (
        <View style={styles.branches}>
          {branches.map(branch => (
            <Pressable
              key={branch.name}
              disabled={branch.current || busy}
              onPress={() => run(() => fileSystem.git.checkout(projectRoot, branch.name), `Switched to ${branch.name}`).then(() => setShowBranches(false))}
              style={[styles.branchRow, branch.current && styles.branchRowCurrent]}>
              <Text style={styles.branchRowText}>{branch.current ? '● ' : '○ '}{branch.name}</Text>
            </Pressable>
          ))}
          <View style={styles.newBranch}>
            <Field value={newBranch} onChangeText={setNewBranch} placeholder="new branch name" style={{flex: 1}} onSubmitEditing={() => newBranch && run(() => fileSystem.git.checkout(projectRoot, newBranch, true), `Created ${newBranch}`).then(() => { setNewBranch(''); setShowBranches(false); })} />
            <SmallButton title="Create" disabled={!newBranch || busy} onPress={() => run(() => fileSystem.git.checkout(projectRoot, newBranch, true), `Created ${newBranch}`).then(() => { setNewBranch(''); setShowBranches(false); })} />
          </View>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.commitBox}>
          <Field
            value={message}
            onChangeText={setMessage}
            placeholder={amend ? 'New message (leave empty to keep)' : 'Commit message'}
            onSubmitEditing={() => (message.trim() || amend) && staged.length > 0 && commit()}
            testID="commit-message"
          />
          <View style={styles.commitActions}>
            <Pressable onPress={() => setAmend(value => !value)} style={styles.amend}>
              <Text style={[styles.amendText, amend && styles.amendOn]}>{amend ? '☑' : '☐'} Amend</Text>
            </Pressable>
            <SmallButton
              title={amend ? 'Amend' : `Commit${staged.length ? ` (${staged.length})` : ''}`}
              tone="accent"
              disabled={busy || (!amend && (!message.trim() || staged.length === 0))}
              onPress={commit}
              testID="commit-button"
            />
          </View>
        </View>

        <SectionTitle
          title={`Staged (${staged.length})`}
          right={staged.length > 0 && <SmallButton title="Unstage all" disabled={busy} onPress={() => run(() => fileSystem.git.unstage(projectRoot, 'all'))} />}
        />
        {staged.length === 0 && <Text style={styles.hint}>Nothing staged.</Text>}
        {staged.map(change => (
          <ChangeRow
            key={`staged-${change.path}`}
            change={change}
            letter={change.index}
            selected={diffPath === change.path}
            onPress={() => onShowDiff?.(change.path, {staged: true})}
            onOpen={() => onOpenFile?.(change.path)}
            actions={<IconButton glyph="−" label="Unstage" onPress={() => run(() => fileSystem.git.unstage(projectRoot, [change.path]))} testID={`unstage-${change.path}`} />}
            styles={styles}
          />
        ))}

        <SectionTitle
          title={`Changes (${unstaged.length})`}
          right={unstaged.length > 0 && <SmallButton title="Stage all" disabled={busy} onPress={() => run(() => fileSystem.git.stage(projectRoot, 'all'))} testID="stage-all" />}
        />
        {unstaged.length === 0 && <Text style={styles.hint}>Working tree clean.</Text>}
        {unstaged.map(change => (
          <ChangeRow
            key={`unstaged-${change.path}`}
            change={change}
            letter={change.index === '?' ? '?' : change.worktree}
            selected={diffPath === change.path}
            onPress={() => onShowDiff?.(change.path, {staged: false})}
            onOpen={() => onOpenFile?.(change.path)}
            actions={
              confirmDiscard === change.path ? (
                <>
                  <SmallButton title="Discard" tone="danger" onPress={() => { setConfirmDiscard(null); run(() => fileSystem.git.discard(projectRoot, [change.path]), `Discarded ${change.path}`); }} testID={`confirm-discard-${change.path}`} />
                  <SmallButton title="Keep" onPress={() => setConfirmDiscard(null)} />
                </>
              ) : (
                <>
                  <IconButton glyph="↺" label="Discard changes" tone="danger" onPress={() => setConfirmDiscard(change.path)} testID={`discard-${change.path}`} />
                  <IconButton glyph="＋" label="Stage" onPress={() => run(() => fileSystem.git.stage(projectRoot, [change.path]))} testID={`stage-${change.path}`} />
                </>
              )
            }
            styles={styles}
          />
        ))}

        <Pressable onPress={() => setShowLog(open => !open)}>
          <SectionTitle title={`${showLog ? '▾' : '▸'} Recent commits`} />
        </Pressable>
        {showLog &&
          log.map(entry => (
            <View key={entry.hash} style={styles.commitRow}>
              <Text style={styles.commitHash}>{entry.short}</Text>
              <Text style={styles.commitSubject} numberOfLines={1}>{entry.subject}</Text>
              <Text style={styles.commitMeta} numberOfLines={1}>{entry.author} · {relativeDate(entry.date)}</Text>
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

function ChangeRow({change, letter, selected, onPress, onOpen, actions, styles}) {
  const [hovered, setHovered] = useState(false);
  const kind = gitKind(change);
  const color = GIT_COLORS[kind] ?? styles.name.color;
  const name = change.path.split('/').pop();
  const directory = change.path.includes('/') ? change.path.slice(0, change.path.lastIndexOf('/')) : '';

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.change, selected && styles.changeSelected]}
      testID={`change-${change.path}`}
      tooltip={change.path}>
      <FileIcon name={name} size={14} />
      <Text style={[styles.name, {color}]} numberOfLines={1}>{name}</Text>
      <Text style={styles.directory} numberOfLines={1}>{directory}</Text>
      {hovered ? (
        <View style={styles.rowActions}>
          <IconButton glyph="↗" label="Open file" onPress={onOpen} />
          {actions}
        </View>
      ) : (
        <Text style={[styles.letter, {color}]}>{letter === '?' ? 'U' : letter || gitLetter(change)}</Text>
      )}
    </Pressable>
  );
}

export function relativeDate(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }

  const seconds = Math.round((now - then) / 1000);
  const units = [
    ['y', 31536000],
    ['mo', 2592000],
    ['w', 604800],
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
  ];

  for (const [label, size] of units) {
    if (Math.abs(seconds) >= size) {
      return `${Math.round(seconds / size)}${label} ago`;
    }
  }

  return 'just now';
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
    paddingHorizontal: 10,
    paddingTop: 8,
    gap: 4,
  },
  branch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  branchGlyph: {
    color: colors.primary,
    fontSize: 14,
  },
  branchName: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  chevron: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  branches: {
    marginHorizontal: 10,
    marginTop: 4,
    padding: 6,
    borderRadius: 10,
    gap: 2,
    ...glass(colors, {variant: 'surface'}),
  },
  branchRow: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  branchRowCurrent: {
    backgroundColor: withAlpha(colors.primary, 0.2),
  },
  branchRowText: {
    color: colors.onSurface,
    fontSize: 12.5,
  },
  newBranch: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 10,
    paddingTop: 6,
  },
  commitBox: {
    gap: 6,
    marginBottom: 6,
  },
  commitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amend: {
    paddingVertical: 4,
  },
  amendText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  amendOn: {
    color: colors.onSurface,
  },
  hint: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  changeSelected: {
    backgroundColor: withAlpha(colors.primary, 0.22),
  },
  name: {
    color: colors.onSurface,
    fontSize: 12.5,
  },
  directory: {
    flex: 1,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  letter: {
    fontSize: 11,
    fontWeight: '700',
    width: 14,
    textAlign: 'center',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  commitRow: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 1,
  },
  commitHash: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: 'Menlo',
  },
  commitSubject: {
    color: colors.onSurface,
    fontSize: 12.5,
  },
  commitMeta: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
});
