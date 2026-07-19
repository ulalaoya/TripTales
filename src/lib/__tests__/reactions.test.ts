import { describe, it, expect } from 'vitest';
import { toggleReact, ALLOWED_EMOJIS } from '../reactions';

describe('ALLOWED_EMOJIS', () => {
  it('is exactly the six spec emojis', () =>
    expect(ALLOWED_EMOJIS).toEqual(['❤️', '😂', '😮', '⭐', '🍦', '👍']));
});

describe('toggleReact', () => {
  it('adds a member to an empty reacts object', () => {
    const out = toggleReact({}, '❤️', 'm1');
    expect(out['❤️']).toEqual(['m1']);
  });

  it('removes a member who already reacted (toggle off)', () => {
    const out = toggleReact({ '❤️': ['m1', 'm2'] }, '❤️', 'm1');
    expect(out['❤️']).toEqual(['m2']);
  });

  it('keeps other members intact when toggling', () => {
    const out = toggleReact({ '👍': ['m2'] }, '👍', 'm1');
    expect(out['👍']).toContain('m1');
    expect(out['👍']).toContain('m2');
  });

  it('does not mutate the input object (immutability)', () => {
    const input = { '⭐': ['m1'] };
    const snapshot = JSON.parse(JSON.stringify(input));
    toggleReact(input, '⭐', 'm2');
    expect(input).toEqual(snapshot);
  });

  it('per-member isolation: toggling m1 never affects m2 entries', () => {
    const out1 = toggleReact({ '😂': ['m2'] }, '😂', 'm1'); // add m1
    const out2 = toggleReact(out1, '😂', 'm1');             // remove m1
    expect(out2['😂'] ?? []).toEqual(['m2']);
  });
});
