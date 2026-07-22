import { describe, it, expect } from 'vitest';
import { phoneHash } from '../phoneHash';

describe('phoneHash', () => {
  it('is deterministic', () => {
    expect(phoneHash('0501234567')).toBe(phoneHash('0501234567'));
  });

  it('ignores spaces and dashes (same number → same hash)', () => {
    const canonical = phoneHash('0501234567');
    expect(phoneHash('050-123-4567')).toBe(canonical);
    expect(phoneHash('050 123 4567')).toBe(canonical);
    expect(phoneHash(' 050-123 4567 ')).toBe(canonical);
  });

  it('different numbers → different hashes', () => {
    expect(phoneHash('0501234567')).not.toBe(phoneHash('0527654321'));
  });

  it('a one-digit change changes the hash', () => {
    expect(phoneHash('0501234567')).not.toBe(phoneHash('0501234568'));
  });

  it('returns opaque lowercase hex', () => {
    expect(phoneHash('0501234567')).toMatch(/^[0-9a-f]+$/);
  });

  it('NEVER contains the phone number itself', () => {
    const phone = '0501234567';
    const hash = phoneHash(phone);
    expect(hash).not.toContain(phone);
    expect(hash).not.toContain('501234567');
    expect(hash).not.toContain('0501');
  });

  it('no collisions across a large batch of Israeli numbers', () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      hashes.add(phoneHash('05' + String(10000000 + i).slice(0, 8)));
    }
    expect(hashes.size).toBe(3000);
  });
});
