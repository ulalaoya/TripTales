import { describe, it, expect } from 'vitest';
import { initialDayIndex } from '../tripSelect';

/** A 5-day trip, 10–14 August 2026. */
const days = [
  { date: '2026-08-10' },
  { date: '2026-08-11' },
  { date: '2026-08-12' },
  { date: '2026-08-13' },
  { date: '2026-08-14' },
];

describe('initialDayIndex', () => {
  it('opens on today while the trip is running', () => {
    expect(initialDayIndex(days, '2026-08-12')).toBe(2);
  });

  it('opens on the first day when the trip has not started', () => {
    expect(initialDayIndex(days, '2026-07-01')).toBe(0);
  });

  it('opens on the last day when the trip is over', () => {
    expect(initialDayIndex(days, '2026-09-01')).toBe(4);
  });

  it('handles the first and last day exactly', () => {
    expect(initialDayIndex(days, '2026-08-10')).toBe(0);
    expect(initialDayIndex(days, '2026-08-14')).toBe(4);
  });

  it('picks the next day when today falls in a gap', () => {
    const gapped = [{ date: '2026-08-10' }, { date: '2026-08-14' }];
    expect(initialDayIndex(gapped, '2026-08-12')).toBe(1);
  });

  it('is safe for an empty or malformed day list', () => {
    expect(initialDayIndex([], '2026-08-12')).toBe(0);
    expect(initialDayIndex(undefined as never, '2026-08-12')).toBe(0);
  });

  it('works for a single-day trip regardless of today', () => {
    const one = [{ date: '2026-08-10' }];
    expect(initialDayIndex(one, '2026-08-10')).toBe(0);
    expect(initialDayIndex(one, '2026-01-01')).toBe(0);
    expect(initialDayIndex(one, '2026-12-31')).toBe(0);
  });
});
