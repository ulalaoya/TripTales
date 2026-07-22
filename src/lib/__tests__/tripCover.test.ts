import { describe, it, expect } from 'vitest';
import { coverPhotoOf } from '../tripCover';
import type { Trip } from '../../types';

const photo = (id: string, status: 'approved' | 'pending' = 'approved') =>
  ({ id, svg: '<svg/>', caption: id, fav: false, by: 'm1', status, reacts: {} });

const trip = (over: Partial<Trip>): Trip =>
  ({
    id: 't1',
    name: 'טיול',
    startDate: '2026-08-10',
    endDate: '2026-08-11',
    transport: 'drive',
    order: 0,
    members: ['m1'],
    joinCode: 'ABC234',
    days: [
      { id: 'd1', date: '2026-08-10', title: '', activities: [], entries: [], photos: [] },
      { id: 'd2', date: '2026-08-11', title: '', activities: [], entries: [], photos: [] },
    ],
    ...over,
  }) as unknown as Trip;

describe('coverPhotoOf', () => {
  it('returns the chosen cover when set, valid and approved', () => {
    const t = trip({ coverPhotoId: 'p2' } as Partial<Trip>);
    t.days[0].photos = [photo('p1')];
    t.days[1].photos = [photo('p2')];
    expect(coverPhotoOf(t)?.id).toBe('p2');
  });

  it('falls back to the first approved photo when no cover is chosen', () => {
    const t = trip({});
    t.days[0].photos = [photo('p1')];
    t.days[1].photos = [photo('p2')];
    expect(coverPhotoOf(t)?.id).toBe('p1');
  });

  it('ignores a chosen cover that no longer exists', () => {
    const t = trip({ coverPhotoId: 'gone' } as Partial<Trip>);
    t.days[0].photos = [photo('p1')];
    expect(coverPhotoOf(t)?.id).toBe('p1');
  });

  it('ignores a chosen cover that is only pending (not approved)', () => {
    const t = trip({ coverPhotoId: 'p1' } as Partial<Trip>);
    t.days[0].photos = [photo('p1', 'pending'), photo('p2', 'approved')];
    expect(coverPhotoOf(t)?.id).toBe('p2');
  });

  it('skips pending photos when falling back to the first', () => {
    const t = trip({});
    t.days[0].photos = [photo('p1', 'pending')];
    t.days[1].photos = [photo('p2', 'approved')];
    expect(coverPhotoOf(t)?.id).toBe('p2');
  });

  it('returns undefined when there are no approved photos', () => {
    const t = trip({});
    t.days[0].photos = [photo('p1', 'pending')];
    expect(coverPhotoOf(t)).toBeUndefined();
  });

  it('does not throw on a trip with empty days', () => {
    const t = trip({ days: [] as unknown as Trip['days'] });
    expect(coverPhotoOf(t)).toBeUndefined();
  });
});
