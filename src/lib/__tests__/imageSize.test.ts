import { describe, it, expect } from 'vitest';
import { dataUrlBytes, withinFirestoreLimit } from '../imageSize';

/** base64 of n bytes (no padding edge cases): 4 chars per 3 bytes. */
const dataUrlOfBytes = (n: number) => {
  const b64 = Buffer.alloc(n).toString('base64');
  return 'data:image/jpeg;base64,' + b64;
};

describe('dataUrlBytes', () => {
  it('measures the decoded payload, not the string length', () => {
    expect(dataUrlBytes(dataUrlOfBytes(300))).toBe(300);
  });

  it('handles padding correctly', () => {
    // 1 byte -> "AA==" (2 padding chars); 2 bytes -> "AAA=" (1 padding char)
    expect(dataUrlBytes(dataUrlOfBytes(1))).toBe(1);
    expect(dataUrlBytes(dataUrlOfBytes(2))).toBe(2);
    expect(dataUrlBytes(dataUrlOfBytes(3))).toBe(3);
  });

  it('non-data-url input → 0', () => {
    expect(dataUrlBytes('חוף הכנרת')).toBe(0);
    expect(dataUrlBytes('')).toBe(0);
    expect(dataUrlBytes('https://example.com/a.jpg')).toBe(0);
  });
});

describe('withinFirestoreLimit', () => {
  it('a small photo is fine', () => {
    expect(withinFirestoreLimit(dataUrlOfBytes(150_000))).toBe(true);
  });

  it('just under the budget passes', () => {
    expect(withinFirestoreLimit(dataUrlOfBytes(899_000))).toBe(true);
  });

  it('over the budget fails', () => {
    expect(withinFirestoreLimit(dataUrlOfBytes(950_000))).toBe(false);
  });

  it('stays under Firestore’s hard 1MB document ceiling', () => {
    // whatever budget is configured, it must leave room for the rest of the doc
    expect(dataUrlBytes(dataUrlOfBytes(900_000))).toBeLessThan(1_048_576);
  });
});
