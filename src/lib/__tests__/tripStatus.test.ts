import { describe, it, expect } from 'vitest';
import { tripStatus, statusLabel } from '../tripStatus';

const trip = (start: string, end: string, idea = false) =>
  ({ id: 't', name: 'x', startDate: start, endDate: end, idea } as never);

describe('tripStatus', () => {
  const today = '2026-07-19';

  it('idea flag wins over dates', () =>
    expect(tripStatus(trip('2026-08-01', '2026-08-05', true), today)).toBe('idea'));

  it('future trip → planned', () =>
    expect(tripStatus(trip('2026-08-01', '2026-08-05'), today)).toBe('planned'));

  it('past trip → ended', () =>
    expect(tripStatus(trip('2026-06-01', '2026-06-05'), today)).toBe('ended'));

  it('today inside range → active', () =>
    expect(tripStatus(trip('2026-07-15', '2026-07-22'), today)).toBe('active'));

  it('start date today → active (inclusive)', () =>
    expect(tripStatus(trip('2026-07-19', '2026-07-25'), today)).toBe('active'));

  it('end date today → active (inclusive)', () =>
    expect(tripStatus(trip('2026-07-10', '2026-07-19'), today)).toBe('active'));

  it('one-day trip today → active', () =>
    expect(tripStatus(trip('2026-07-19', '2026-07-19'), today)).toBe('active'));
});

describe('statusLabel', () => {
  it('returns Hebrew labels', () => {
    expect(statusLabel('planned', 'he')).toBeTruthy();
    expect(statusLabel('ended', 'he')).toBeTruthy();
    expect(statusLabel('idea', 'he')).toBeTruthy();
  });
  it('he and en labels differ', () => {
    expect(statusLabel('planned', 'he')).not.toBe(statusLabel('planned', 'en'));
  });
});
