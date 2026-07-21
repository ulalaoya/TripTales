import { describe, it, expect } from 'vitest';
import { hebrewWeekday, dayTabLabel } from '../dayFormat';

describe('hebrewWeekday', () => {
  // 2026-08-10 is a Monday → יום שני → ב׳
  const cases: Array<[string, string]> = [
    ['2026-08-09', 'א׳'], // Sunday
    ['2026-08-10', 'ב׳'], // Monday
    ['2026-08-11', 'ג׳'],
    ['2026-08-12', 'ד׳'],
    ['2026-08-13', 'ה׳'],
    ['2026-08-14', 'ו׳'],
    ['2026-08-15', 'ש׳'], // Saturday
  ];
  for (const [iso, label] of cases) {
    it(`${iso} → ${label}`, () => expect(hebrewWeekday(iso)).toBe(label));
  }
});

describe('dayTabLabel', () => {
  it('formats weekday + day.month without leading zeros', () => {
    expect(dayTabLabel('2026-08-10')).toBe('ב׳ · 10.8');
  });

  it('single-digit day and month have no padding', () => {
    // 2026-03-05 is a Thursday
    expect(dayTabLabel('2026-03-05')).toBe('ה׳ · 5.3');
  });

  it('handles end-of-year dates', () => {
    // 2026-12-31 is a Thursday
    expect(dayTabLabel('2026-12-31')).toBe('ה׳ · 31.12');
  });

  it('is stable across calls', () => {
    expect(dayTabLabel('2026-08-16')).toBe(dayTabLabel('2026-08-16'));
  });
});
