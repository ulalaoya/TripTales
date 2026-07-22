import { describe, it, expect } from 'vitest';
import { pickNewer } from '../mergeRemote';

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
