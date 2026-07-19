import { describe, it, expect } from 'vitest';
import { normalizePhone, isValidIsraeliPhone } from '../phone';

describe('normalizePhone', () => {
  it('strips spaces', () => expect(normalizePhone('050 123 4567')).toBe('0501234567'));
  it('strips dashes', () => expect(normalizePhone('050-123-4567')).toBe('0501234567'));
  it('strips mixed spaces and dashes', () =>
    expect(normalizePhone(' 03-123 4567 ')).toBe('031234567'));
  it('leaves clean numbers untouched', () =>
    expect(normalizePhone('0771234567')).toBe('0771234567'));
});

describe('isValidIsraeliPhone — valid numbers', () => {
  const valid = [
    '0501234567',      // mobile 05x
    '050-123-4567',    // mobile with dashes
    '052 765 4321',    // mobile with spaces
    '0591234567',      // 059
    '031234567',       // landline 03 (9 digits total)
    '03 1234567',
    '021234567',       // 02
    '041234567',       // 04
    '081234567',       // 08
    '091234567',       // 09
    '0771234567',      // VoIP 07x (10 digits)
    '0721234567',
  ];
  for (const p of valid) it(`accepts ${p}`, () => expect(isValidIsraeliPhone(p)).toBe(true));
});

describe('isValidIsraeliPhone — invalid numbers', () => {
  const invalid = [
    '0511234',         // too short
    '05112345678',     // too long
    '1234567890',      // no leading 0
    '060-1234567',     // 06 not allocated
    '0112345678',      // 01 not allocated
    '',                // empty
    '05O1234567',      // letter O
    '+972501234567',   // international format not accepted by the spec regex
    '0212345678',      // landline with too many digits (02 + 8 digits = 10)
  ];
  for (const p of invalid) it(`rejects ${p}`, () => expect(isValidIsraeliPhone(p)).toBe(false));
});
