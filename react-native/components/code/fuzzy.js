/**
 * Scoring for the palette and quick open: every character of the query has
 * to appear in the candidate, in order. Matches on the start of a word, or a
 * run of consecutive characters, score higher; gaps cost a little. Returns
 * zero for no match, so callers filter on truthiness.
 */
export function fuzzyMatch(query, candidate) {
  const needle = String(query ?? '').toLowerCase();
  const haystack = String(candidate ?? '').toLowerCase();

  if (!needle) {
    return {score: 1, positions: []};
  }

  if (haystack === needle) {
    return {score: 10000, positions: [...Array(needle.length).keys()]};
  }

  const direct = haystack.indexOf(needle);
  if (direct !== -1) {
    const boundary = direct === 0 || /[\s/._-]/.test(haystack[direct - 1]);
    const positions = [...Array(needle.length).keys()].map(index => direct + index);
    return {score: 1000 + (boundary ? 200 : 0) - direct - (haystack.length - needle.length) / 10, positions};
  }

  let score = 0;
  let position = 0;
  let previous = -2;
  const positions = [];

  for (const character of needle) {
    const found = haystack.indexOf(character, position);

    if (found === -1) {
      return null;
    }

    const before = haystack[found - 1];
    const boundary = found === 0 || /[\s/._-]/.test(before) || (before && before !== before.toUpperCase() && candidate[found] === candidate[found].toUpperCase());

    score += 10;
    if (boundary) {
      score += 15;
    }
    if (found === previous + 1) {
      score += 20;
    }
    score -= Math.min(20, (found - position) * 2);

    positions.push(found);
    previous = found;
    position = found + 1;
  }

  return {score: Math.max(1, score), positions};
}

/** Filter and sort `items` by `fuzzyMatch` on `pick(item)`, best first. */
export function fuzzyFilter(query, items, pick = item => String(item), limit = 50) {
  const scored = [];

  for (const item of items) {
    const match = fuzzyMatch(query, pick(item));

    if (match) {
      scored.push({item, score: match.score, positions: match.positions});
    }
  }

  scored.sort((a, b) => b.score - a.score || String(pick(a.item)).localeCompare(String(pick(b.item))));

  return scored.slice(0, limit);
}
