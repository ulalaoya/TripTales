import { describe, it, expect } from 'vitest';
import { canAddChecklistItem } from '../checklistPerms';
import { canEditChecklist } from '../checklist';

describe('canAddChecklistItem', () => {
  it('an adult can add items', () => expect(canAddChecklistItem('מבוגר')).toBe(true));
  it('a child can ALSO add items (item 16)', () => expect(canAddChecklistItem('ילד')).toBe(true));
});

describe('canEditChecklist stays structural (parent-only)', () => {
  it('adult keeps structural edit rights', () => expect(canEditChecklist('מבוגר')).toBe(true));
  it('child still cannot do structural edits (delete/add-group)', () =>
    expect(canEditChecklist('ילד')).toBe(false));
});
