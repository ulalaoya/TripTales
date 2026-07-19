import { describe, it, expect } from 'vitest';
import { checklistProgress, groupProgress, canEditChecklist, canToggleItem } from '../checklist';

const g = (name: string, dones: boolean[], owner: string = 'all') => ({
  id: 'g-' + name,
  name,
  emoji: '👕',
  items: dones.map((done, i) => ({ id: `i-${name}-${i}`, label: `פריט ${i}`, owner, done })),
});

describe('checklistProgress', () => {
  it('counts done/total across groups', () => {
    const cl = [g('a', [true, true, false]), g('b', [false, true])];
    expect(checklistProgress(cl)).toEqual({ done: 3, total: 5, pct: 60 });
  });

  it('empty checklist → 0/0/0 (no NaN)', () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it('groups with no items do not break pct', () => {
    const cl = [g('a', []), g('b', [true])];
    expect(checklistProgress(cl)).toEqual({ done: 1, total: 1, pct: 100 });
  });

  it('pct is rounded to an integer', () => {
    const cl = [g('a', [true, false, false])]; // 1/3 = 33.33…
    expect(checklistProgress(cl).pct).toBe(33);
  });
});

describe('groupProgress', () => {
  it('counts within a single group', () => {
    expect(groupProgress(g('a', [true, false, true, false]))).toEqual({ done: 2, total: 4 });
  });
});

describe('checklist permissions', () => {
  it('structural edits are parent-only', () => {
    expect(canEditChecklist('מבוגר')).toBe(true);
    expect(canEditChecklist('ילד')).toBe(false);
  });
  it('toggling items is allowed for both roles', () => {
    expect(canToggleItem('מבוגר')).toBe(true);
    expect(canToggleItem('ילד')).toBe(true);
  });
});
