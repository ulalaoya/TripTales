import { describe, it, expect } from 'vitest';
import { weekdayWord } from '../dayFormat';

describe('weekdayWord', () => {
  // 2026-08-10 is a Monday → יום ב׳
  const cases: Array<[string, string]> = [
    ['2026-08-09', 'יום א׳'],
    ['2026-08-10', 'יום ב׳'],
    ['2026-08-11', 'יום ג׳'],
    ['2026-08-12', 'יום ד׳'],
    ['2026-08-13', 'יום ה׳'],
    ['2026-08-14', 'יום ו׳'],
    ['2026-08-15', 'יום ש׳'],
  ];
  for (const [iso, word] of cases) {
    it(`${iso} → ${word}`, () => expect(weekdayWord(iso)).toBe(word));
  }

  it('is prefixed with "יום " and matches the existing weekday letter', () => {
    expect(weekdayWord('2026-08-16')).toBe('יום א׳');
  });
});
