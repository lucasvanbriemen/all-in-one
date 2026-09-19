/**
 * Which files are open, in which editor group, and which one each group shows.
 *
 * A pure reducer: the page keeps the result in state and every keyboard
 * shortcut, tab click and tree action goes through here, so the rules — a
 * closed tab hands focus to its neighbour, a split copies the current file
 * across, an emptied second group folds back into the first — live in one
 * place and can be tested without a renderer.
 *
 *   {groups: [{id, tabs: [path], active: path | null}], activeGroup: id}
 */
export const MAX_GROUPS = 2;

let nextId = 1;

function newGroup(tabs = [], active = null) {
  return {id: nextId++, tabs, active: active ?? tabs[0] ?? null};
}

export function initialEditorState() {
  const group = newGroup();
  return {groups: [group], activeGroup: group.id};
}

export function activeGroup(state) {
  return state.groups.find(group => group.id === state.activeGroup) ?? state.groups[0];
}

export function activeFile(state) {
  return activeGroup(state)?.active ?? null;
}

/** Every open path, once, across all groups. */
export function openPaths(state) {
  return [...new Set(state.groups.flatMap(group => group.tabs))];
}

function updateGroup(state, id, update) {
  return {
    ...state,
    groups: state.groups.map(group => (group.id === id ? {...group, ...update(group)} : group)),
  };
}

/**
 * A second group that has lost its last tab is removed; a single group stays
 * even when empty, so the page always has somewhere to open the next file.
 */
function collapseEmpty(state) {
  if (state.groups.length <= 1) {
    return state;
  }

  const groups = state.groups.filter(group => group.tabs.length > 0);

  if (groups.length === state.groups.length) {
    return state;
  }

  const kept = groups.length ? groups : [state.groups[0]];
  const activeGroup = kept.some(group => group.id === state.activeGroup) ? state.activeGroup : kept[0].id;

  return {...state, groups: kept, activeGroup};
}

export function editorReducer(state, action) {
  switch (action.type) {
    case 'open': {
      const id = action.groupId ?? state.activeGroup;
      const next = updateGroup(state, id, group => ({
        tabs: group.tabs.includes(action.path) ? group.tabs : [...group.tabs, action.path],
        active: action.background ? group.active ?? action.path : action.path,
      }));

      return {...next, activeGroup: action.background ? state.activeGroup : id};
    }

    case 'activate': {
      const id = action.groupId ?? state.groups.find(group => group.tabs.includes(action.path))?.id ?? state.activeGroup;
      const next = updateGroup(state, id, group => ({
        active: group.tabs.includes(action.path) ? action.path : group.active,
      }));

      return {...next, activeGroup: id};
    }

    case 'activateGroup': {
      if (!state.groups.some(group => group.id === action.groupId)) {
        return state;
      }

      return {...state, activeGroup: action.groupId};
    }

    case 'close': {
      const id = action.groupId ?? state.activeGroup;
      const next = updateGroup(state, id, group => {
        const index = group.tabs.indexOf(action.path);

        if (index === -1) {
          return {};
        }

        const tabs = group.tabs.filter(tab => tab !== action.path);
        let active = group.active;

        // The tab to the right, then to the left — what a browser does.
        if (group.active === action.path) {
          active = tabs[Math.min(index, tabs.length - 1)] ?? null;
        }

        return {tabs, active};
      });

      return collapseEmpty(next);
    }

    case 'closeOthers': {
      const id = action.groupId ?? state.activeGroup;
      return updateGroup(state, id, group => ({
        tabs: group.tabs.includes(action.path) ? [action.path] : group.tabs,
        active: group.tabs.includes(action.path) ? action.path : group.active,
      }));
    }

    case 'closeAll': {
      const id = action.groupId ?? state.activeGroup;
      return collapseEmpty(updateGroup(state, id, () => ({tabs: [], active: null})));
    }

    /** A file that vanished from disk, or was renamed away: closed everywhere. */
    case 'closeEverywhere': {
      const next = {
        ...state,
        groups: state.groups.map(group => {
          if (!group.tabs.includes(action.path)) {
            return group;
          }

          const index = group.tabs.indexOf(action.path);
          const tabs = group.tabs.filter(tab => tab !== action.path);
          const active = group.active === action.path ? tabs[Math.min(index, tabs.length - 1)] ?? null : group.active;

          return {...group, tabs, active};
        }),
      };

      return collapseEmpty(next);
    }

    case 'rename': {
      const swap = tab => (tab === action.from ? action.to : tab);
      return {
        ...state,
        groups: state.groups.map(group => ({
          ...group,
          tabs: group.tabs.map(swap),
          active: group.active === null ? null : swap(group.active),
        })),
      };
    }

    /** Everything under a renamed folder moves with it. */
    case 'renameFolder': {
      const prefix = `${action.from}/`;
      const swap = tab => (tab === action.from || tab.startsWith(prefix) ? action.to + tab.slice(action.from.length) : tab);
      return {
        ...state,
        groups: state.groups.map(group => ({
          ...group,
          tabs: group.tabs.map(swap),
          active: group.active === null ? null : swap(group.active),
        })),
      };
    }

    case 'move': {
      const id = action.groupId ?? state.activeGroup;
      return updateGroup(state, id, group => {
        const from = group.tabs.indexOf(action.path);

        if (from === -1) {
          return {};
        }

        const to = Math.max(0, Math.min(group.tabs.length - 1, action.to));
        const tabs = [...group.tabs];
        tabs.splice(from, 1);
        tabs.splice(to, 0, action.path);

        return {tabs};
      });
    }

    case 'moveToGroup': {
      const source = state.groups.find(group => group.tabs.includes(action.path));
      const target = state.groups.find(group => group.id === action.groupId);

      if (!source || !target || source.id === target.id) {
        return state;
      }

      let next = editorReducer(state, {type: 'close', path: action.path, groupId: source.id});
      next = editorReducer(next, {type: 'open', path: action.path, groupId: target.id});
      return next;
    }

    case 'next':
    case 'previous': {
      const group = activeGroup(state);

      if (!group || group.tabs.length < 2) {
        return state;
      }

      const index = group.tabs.indexOf(group.active);
      const step = action.type === 'next' ? 1 : -1;
      const active = group.tabs[(index + step + group.tabs.length) % group.tabs.length];

      return updateGroup(state, group.id, () => ({active}));
    }

    /** Split to the right, carrying the current file across so both sides show it. */
    case 'split': {
      if (state.groups.length >= MAX_GROUPS) {
        return state;
      }

      const current = activeGroup(state);
      const group = newGroup(current?.active ? [current.active] : [], current?.active ?? null);

      return {...state, groups: [...state.groups, group], activeGroup: group.id};
    }

    case 'unsplit': {
      if (state.groups.length <= 1) {
        return state;
      }

      const [first, ...rest] = state.groups;
      const tabs = [...first.tabs];

      for (const group of rest) {
        for (const tab of group.tabs) {
          if (!tabs.includes(tab)) {
            tabs.push(tab);
          }
        }
      }

      const active = activeGroup(state)?.active ?? first.active ?? tabs[0] ?? null;

      return {...state, groups: [{...first, tabs, active}], activeGroup: first.id};
    }

    case 'restore': {
      const groups = (action.groups ?? [])
        .map(saved => newGroup([...new Set((saved.tabs ?? []).filter(Boolean))], saved.active ?? null))
        .filter(group => group.tabs.length > 0)
        .slice(0, MAX_GROUPS);

      if (groups.length === 0) {
        return initialEditorState();
      }

      const index = Math.min(action.activeIndex ?? 0, groups.length - 1);

      return {groups, activeGroup: groups[index].id};
    }

    default:
      return state;
  }
}

/** The shape saved between launches; ids are not stable, so positions are used. */
export function serializeEditorState(state) {
  return {
    groups: state.groups.map(group => ({tabs: group.tabs, active: group.active})),
    activeIndex: Math.max(0, state.groups.findIndex(group => group.id === state.activeGroup)),
  };
}
