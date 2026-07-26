import { describe, it, expect } from 'vitest';
import { pickNewer, preserveUnsyncedPhotos } from '../mergeRemote';

const at = (updatedAt?: number, tag = 'x') => ({ updatedAt, tag });

describe('pickNewer', () => {
  it('newer remote wins', () => {
    expect(pickNewer(at(100, 'local'), at(200, 'remote'))?.tag).toBe('remote');
  });

  it('newer local wins', () => {
    expect(pickNewer(at(300, 'local'), at(200, 'remote'))?.tag).toBe('local');
  });

  it('missing remote → local', () => {
    expect(pickNewer(at(100, 'local'), undefined)?.tag).toBe('local');
  });

  it('missing local → remote', () => {
    expect(pickNewer(undefined, at(100, 'remote'))?.tag).toBe('remote');
  });

  it('both missing → undefined', () => {
    expect(pickNewer(undefined, undefined)).toBeUndefined();
  });

  it('a side without updatedAt loses to one that has it', () => {
    expect(pickNewer(at(undefined, 'local'), at(1, 'remote'))?.tag).toBe('remote');
    expect(pickNewer(at(1, 'local'), at(undefined, 'remote'))?.tag).toBe('local');
  });

  it('neither has updatedAt → remote (documented tie-break)', () => {
    expect(pickNewer(at(undefined, 'local'), at(undefined, 'remote'))?.tag).toBe('remote');
  });

  it('equal timestamps → remote (documented tie-break)', () => {
    expect(pickNewer(at(500, 'local'), at(500, 'remote'))?.tag).toBe('remote');
  });
});

describe('preserveUnsyncedPhotos (photo-loss guard)', () => {
  const trip = (photos: { id: string; updatedAt?: number }[]) => ({
    days: [{ id: 'd1', photos }],
  });

  it('keeps local photos that were never synced when remote has none', () => {
    const out = preserveUnsyncedPhotos(trip([{ id: 'p1' }, { id: 'p2' }]), trip([]));
    expect(out.days[0].photos.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('lets a server-confirmed photo disappear (a real deletion)', () => {
    const out = preserveUnsyncedPhotos(trip([{ id: 'p1', updatedAt: 100 }]), trip([]));
    expect(out.days[0].photos).toEqual([]);
  });

  it('never duplicates a photo the remote already carries', () => {
    const out = preserveUnsyncedPhotos(trip([{ id: 'p1' }]), trip([{ id: 'p1', updatedAt: 5 }]));
    expect(out.days[0].photos.map((p) => p.id)).toEqual(['p1']);
  });

  it('merges unsynced local photos alongside the remote ones', () => {
    const out = preserveUnsyncedPhotos(trip([{ id: 'new' }]), trip([{ id: 'old', updatedAt: 5 }]));
    expect(out.days[0].photos.map((p) => p.id)).toEqual(['old', 'new']);
  });

  it('returns the remote object untouched when nothing needs preserving', () => {
    const remote = trip([{ id: 'p1', updatedAt: 5 }]);
    expect(preserveUnsyncedPhotos(trip([]), remote)).toBe(remote);
  });

  it('ignores days that do not exist locally', () => {
    const local = { days: [{ id: 'd1', photos: [{ id: 'p1' }] }] };
    const remote = { days: [{ id: 'd2', photos: [] }] };
    expect(preserveUnsyncedPhotos(local, remote).days[0].photos).toEqual([]);
  });
});
