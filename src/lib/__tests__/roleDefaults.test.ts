import { describe, it, expect } from 'vitest';
import { defaultRoleFor } from '../roleDefaults';

// אבא/אמא/סבא/סבתא → מבוגר (parent); בן/בת/אח/חיה → ילד (child)
const cases: Array<[string, 'מבוגר' | 'ילד']> = [
  ['אבא', 'מבוגר'],
  ['אמא', 'מבוגר'],
  ['סבא', 'מבוגר'],
  ['סבתא', 'מבוגר'],
  ['בן', 'ילד'],
  ['בת', 'ילד'],
  ['אח', 'ילד'],
  ['חיה', 'ילד'],
];

describe('defaultRoleFor', () => {
  for (const [figure, role] of cases) {
    it(`${figure} → ${role}`, () => expect(defaultRoleFor(figure as never)).toBe(role));
  }
});
