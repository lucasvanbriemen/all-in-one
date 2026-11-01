import {FESTIVE_PATTERN, christmasMusicShare, daysUntil, grinchDay, isCozy, isFireworksTime, phaseOf, seasonYear} from '../components/seasonal/season';

jest.mock('../components/seasonal/data', () => ({
  fetchSeasonal: jest.fn(() =>
    Promise.resolve([
      {id: 'xmas-1', title: 'Last Christmas'},
      {id: 'xmas-2', title: 'Jingle Bell Rock'},
      {id: 'xmas-3', title: 'Let It Snow'},
      {id: 'regular-1', title: 'Already liked and festive'},
    ]),
  ),
}));

jest.mock('../components/seasonal/store', () => ({
  loadPersisted: jest.fn(() => Promise.resolve()),
  getPersisted: jest.fn((key, fallback) => fallback),
  setPersisted: jest.fn(),
}));

const on = (month, day, hour = 12, minute = 0) => new Date(2026, month - 1, day, hour, minute);

describe('season calendar', () => {
  test('phases', () => {
    expect(phaseOf(on(10, 31))).toBe(null);
    expect(phaseOf(on(11, 1))).toBe('pre');
    expect(phaseOf(on(12, 1))).toBe('advent');
    expect(phaseOf(on(12, 23))).toBe('advent');
    expect(phaseOf(on(12, 24))).toBe('christmas');
    expect(phaseOf(on(12, 26))).toBe('christmas');
    expect(phaseOf(on(12, 27))).toBe('between');
    expect(phaseOf(on(12, 31))).toBe('nye');
    expect(phaseOf(new Date(2027, 0, 6))).toBe('newyear');
    expect(phaseOf(new Date(2027, 0, 7))).toBe(null);
  });

  test('the first week of January belongs to the season before', () => {
    expect(seasonYear(new Date(2027, 0, 3))).toBe(2026);
    expect(seasonYear(on(12, 3))).toBe(2026);
  });

  test('cozy only late at night, in season', () => {
    expect(isCozy(on(12, 5, 22, 30))).toBe(true);
    expect(isCozy(on(12, 5, 21, 59))).toBe(false);
    expect(isCozy(on(11, 5, 23))).toBe(false);
  });

  test('fireworks for the first half hour of the year', () => {
    expect(isFireworksTime(new Date(2027, 0, 1, 0, 0))).toBe(true);
    expect(isFireworksTime(new Date(2027, 0, 1, 0, 30))).toBe(false);
    expect(isFireworksTime(on(12, 31, 23, 59))).toBe(false);
  });

  test('countdown counts calendar days', () => {
    expect(daysUntil(new Date(2026, 11, 25), on(12, 24, 23, 59))).toBe(1);
    expect(daysUntil(new Date(2026, 11, 25), on(12, 1, 8))).toBe(24);
  });

  test('the Grinch comes on one fixed day between the 3rd and 21st', () => {
    for (let year = 2020; year < 2040; year++) {
      expect(grinchDay(year)).toBeGreaterThanOrEqual(3);
      expect(grinchDay(year)).toBeLessThanOrEqual(21);
      expect(grinchDay(year)).toBe(grinchDay(year));
    }
  });

  test('festive messages', () => {
    expect(FESTIVE_PATTERN.test('Fijne feestdagen! 🎉')).toBe(true);
    expect(FESTIVE_PATTERN.test('merry christmas x')).toBe(true);
    expect(FESTIVE_PATTERN.test('see you at christmas dinner')).toBe(false);
  });
});

describe('Christmas music share', () => {
  test('creeps up through the season and stops hard', () => {
    expect(christmasMusicShare(on(10, 31))).toBe(0);
    expect(christmasMusicShare(on(11, 1))).toBeCloseTo(0.01);
    expect(christmasMusicShare(on(12, 1))).toBeCloseTo(0.1);
    expect(christmasMusicShare(on(12, 15))).toBeCloseTo(0.3);
    expect(christmasMusicShare(on(12, 23))).toBeCloseTo(0.6);
    expect(christmasMusicShare(on(12, 24))).toBe(1);
    expect(christmasMusicShare(on(12, 26))).toBe(1);
    expect(christmasMusicShare(on(12, 27))).toBe(0);
  });

  test('never decreases before Christmas Eve', () => {
    let previous = 0;
    for (let day = 0; day < 54; day++) {
      const share = christmasMusicShare(new Date(2026, 10, 1 + day));
      expect(share).toBeGreaterThanOrEqual(previous);
      previous = share;
    }
  });
});

describe('mixing Christmas songs into a shuffle', () => {
  const {mixChristmas, effectiveShare} = require('../components/seasonal/christmasMusic');
  const regular = Array.from({length: 20}, (_, i) => ({id: `regular-${i}`, title: `Song ${i}`}));

  test('boost modes', () => {
    const date = on(12, 1);
    expect(effectiveShare(date, 'off')).toBe(0);
    expect(effectiveShare(date, 'max')).toBe(1);
    expect(effectiveShare(date, 'more')).toBeCloseTo(0.35);
  });

  test('keeps every regular song, adds festive ones without duplicates', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const mixed = await mixChristmas(regular, {exclude: ['xmas-3']});
    Math.random.mockRestore();

    const ids = mixed.map(song => song.id);
    expect(new Set(ids).size).toBe(ids.length);
    regular.forEach(song => expect(ids).toContain(song.id));
    expect(ids).not.toContain('xmas-3');
  });
});
