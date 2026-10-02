// Small date helpers; the calendar works in local time throughout and only
// converts to ISO strings at the API boundary.

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Monday-first 6×7 grid covering the month, padded with neighbouring days. */
export function monthGrid(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({length: 42}, (_, i) => addDays(start, i));
}

export function monthRange(month) {
  const grid = monthGrid(month);
  return {from: grid[0], to: addDays(grid[grid.length - 1], 1)};
}

export function monthTitle(month) {
  return month.toLocaleDateString('en-GB', {month: 'long', year: 'numeric'});
}

export function timeLabel(value) {
  return new Date(value).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
}

export function dayLabel(date) {
  return date.toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long'});
}

/** Expands multi-day events so each day of the grid lists what it covers. */
export function groupByDay(events) {
  const groups = {};
  for (const event of events) {
    let cursor = startOfDay(new Date(event.starts_at));
    const last = startOfDay(new Date(event.ends_at || event.starts_at));
    while (cursor <= last) {
      (groups[dayKey(cursor)] ??= []).push(event);
      cursor = addDays(cursor, 1);
    }
  }
  return groups;
}

/** Parses "14:30"; returns null when the text is not a time. */
export function parseTime(text) {
  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (hours > 23 || minutes > 59) return null;
  return {hours, minutes};
}
