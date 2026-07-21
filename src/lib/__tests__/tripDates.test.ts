import { describe, it, expect } from 'vitest';
import { minReturnDate, isValidTripRange } from '../tripDates';

describe('minReturnDate', () => {
  it('earliest return is the departure day itself (single-day trip allowed)', () => {
    expect(minReturnDate('2026-08-10')).toBe('2026-08-10');
  });
});

describe('isValidTripRange', () => {
  const today = '2026-07-21';

  it('accepts a future range', () =>
    expect(isValidTripRange('2026-08-10', '2026-08-16', today)).toBe(true));

  it('accepts a trip starting today', () =>
    expect(isValidTripRange(today, '2026-07-25', today)).toBe(true));

  it('accepts a single-day trip', () =>
    expect(isValidTripRange('2026-08-10', '2026-08-10', today)).toBe(true));

  it('rejects a departure in the past', () =>
    expect(isValidTripRange('2026-07-20', '2026-07-25', today)).toBe(false));

  it('rejects a return before departure', () =>
    expect(isValidTripRange('2026-08-10', '2026-08-09', today)).toBe(false));

  it('rejects when both are in the past', () =>
    expect(isValidTripRange('2026-01-01', '2026-01-05', today)).toBe(false));

  it('rejects empty input', () => {
    expect(isValidTripRange('', '2026-08-16', today)).toBe(false);
    expect(isValidTripRange('2026-08-10', '', today)).toBe(false);
  });
});
