import { describe, it, expect } from 'vitest';
import { generateJoinCode, normalizeJoinCode, isValidJoinCodeFormat } from '../joinCode';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

describe('generateJoinCode', () => {
  it('returns 6 chars from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateJoinCode();
      expect(code).toHaveLength(6);
      for (const ch of code) expect(ALPHABET).toContain(ch);
    }
  });

  it('never contains ambiguous chars (0, O, 1, I, L)', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateJoinCode()).not.toMatch(/[0O1IL]/);
    }
  });

  it('produces varied codes (not constant)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateJoinCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('normalizeJoinCode', () => {
  it('uppercases', () => expect(normalizeJoinCode('abc234')).toBe('ABC234'));
  it('strips spaces and dashes', () =>
    expect(normalizeJoinCode(' ab-c 234 ')).toBe('ABC234'));
});

describe('isValidJoinCodeFormat', () => {
  it('accepts a normalized 6-char code', () =>
    expect(isValidJoinCodeFormat('ABC234')).toBe(true));
  it('accepts messy but normalizable input', () =>
    expect(isValidJoinCodeFormat('ab-c234')).toBe(true));
  it('rejects wrong length', () => {
    expect(isValidJoinCodeFormat('ABC23')).toBe(false);
    expect(isValidJoinCodeFormat('ABC2345')).toBe(false);
    expect(isValidJoinCodeFormat('')).toBe(false);
  });
  it('rejects chars outside the alphabet', () => {
    expect(isValidJoinCodeFormat('ABC10O')).toBe(false);
    expect(isValidJoinCodeFormat('ABCI2L')).toBe(false);
  });
});
