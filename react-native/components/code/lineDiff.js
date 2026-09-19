/**
 * Line diff for the gutter: which lines of the buffer are new, changed or
 * sit where committed lines used to be. Myers' O(ND) algorithm over lines,
 * after trimming the common prefix and suffix — a file with one edit is a
 * one-line problem however long it is.
 *
 * Both functions are pure and run on the React Native side; the result is
 * pushed to Monaco as decorations.
 */
export function splitLines(text) {
  const lines = String(text ?? '').split('\n');

  // A trailing newline is the end of the last line, not an extra empty one.
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines;
}

/**
 * Returns hunks of `{originalStart, originalLength, modifiedStart, modifiedLength}`
 * with zero-based starts. An insertion has originalLength 0; a deletion has
 * modifiedLength 0.
 */
export function lineDiff(originalText, modifiedText) {
  const a = splitLines(originalText);
  const b = splitLines(modifiedText);

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) {
    start++;
  }

  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const middleA = a.slice(start, endA);
  const middleB = b.slice(start, endB);

  if (middleA.length === 0 && middleB.length === 0) {
    return [];
  }

  if (middleA.length === 0 || middleB.length === 0) {
    return [{originalStart: start, originalLength: middleA.length, modifiedStart: start, modifiedLength: middleB.length}];
  }

  const edits = myers(middleA, middleB);

  return coalesce(edits, start);
}

/** Myers' shortest edit script; returns a list of {type: 'equal'|'delete'|'insert', a, b}. */
function myers(a, b) {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max;
  const trace = [];
  let v = new Array(2 * max + 2).fill(0);

  let finished = false;

  for (let d = 0; d <= max && !finished; d++) {
    const next = v.slice();

    for (let k = -d; k <= d && !finished; k += 2) {
      let x;

      if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) {
        x = v[offset + k + 1];
      } else {
        x = v[offset + k - 1] + 1;
      }

      let y = x - k;

      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }

      next[offset + k] = x;

      if (x >= n && y >= m) {
        finished = true;
      }
    }

    trace.push(next);
    v = next;
  }

  // Walk the trace back to recover the path.
  const edits = [];
  let x = n;
  let y = m;

  for (let d = trace.length - 1; d >= 0; d--) {
    const vd = trace[d];
    const k = x - y;
    let previousK;

    if (k === -d || (k !== d && vd[offset + k - 1] < vd[offset + k + 1])) {
      previousK = k + 1;
    } else {
      previousK = k - 1;
    }

    const previousX = d === 0 ? 0 : trace[d - 1][offset + previousK];
    const previousY = previousX - previousK;

    while (x > previousX && y > previousY) {
      edits.push({type: 'equal', a: x - 1, b: y - 1});
      x--;
      y--;
    }

    if (d > 0) {
      if (x === previousX) {
        edits.push({type: 'insert', a: x, b: y - 1});
        y--;
      } else {
        edits.push({type: 'delete', a: x - 1, b: y});
        x--;
      }
    }
  }

  edits.reverse();
  return edits;
}

/** Runs of inserts and deletes become hunks; equal lines close them. */
function coalesce(edits, base) {
  const hunks = [];
  let current = null;

  for (const edit of edits) {
    if (edit.type === 'equal') {
      current = null;
      continue;
    }

    if (!current) {
      current = {
        originalStart: base + (edit.type === 'delete' ? edit.a : edit.a),
        originalLength: 0,
        modifiedStart: base + (edit.type === 'insert' ? edit.b : edit.b),
        modifiedLength: 0,
      };
      hunks.push(current);
    }

    if (edit.type === 'delete') {
      current.originalLength++;
    } else {
      current.modifiedLength++;
    }
  }

  return hunks;
}

/**
 * Hunks as the gutter draws them, one-based and inclusive: `added` and
 * `modified` cover buffer lines; `deleted` marks the line after which
 * committed lines are missing (line 0 means before the first).
 */
export function gutterChanges(hunks) {
  return hunks.map(hunk => {
    if (hunk.originalLength === 0) {
      return {kind: 'added', startLine: hunk.modifiedStart + 1, endLine: hunk.modifiedStart + hunk.modifiedLength};
    }

    if (hunk.modifiedLength === 0) {
      return {kind: 'deleted', startLine: hunk.modifiedStart, endLine: hunk.modifiedStart};
    }

    return {kind: 'modified', startLine: hunk.modifiedStart + 1, endLine: hunk.modifiedStart + hunk.modifiedLength};
  });
}
