import { describe, it, expect } from 'vitest';
import { can, uploadStatusFor } from '../permissions';

type Role = 'מבוגר' | 'ילד';

// Full R2–R4 capability matrix from the implementation prompt
const matrix: Array<[string, boolean, boolean]> = [
  // action, parent, child
  ['trip.create', true, false],
  ['trip.edit', true, false],
  ['trip.delete', true, false],
  ['trip.reorder', true, false],
  ['entry.create', true, false],
  ['entry.delete', true, false],
  ['photo.upload', true, true],
  ['photo.approve', true, false],
  ['react', true, true],
  ['favourite', true, true],
  ['share', true, true],
  ['profile.editRole', true, false],
];

describe('R2–R4 permission matrix', () => {
  for (const [action, parentAllowed, childAllowed] of matrix) {
    it(`parent ${parentAllowed ? 'CAN' : 'CANNOT'} ${action}`, () =>
      expect(can('מבוגר' as Role, action as never)).toBe(parentAllowed));
    it(`child ${childAllowed ? 'CAN' : 'CANNOT'} ${action}`, () =>
      expect(can('ילד' as Role, action as never)).toBe(childAllowed));
  }
});

describe('uploadStatusFor', () => {
  it('parent uploads are auto-approved', () =>
    expect(uploadStatusFor('מבוגר')).toBe('approved'));
  it('child uploads are pending', () =>
    expect(uploadStatusFor('ילד')).toBe('pending'));
});
