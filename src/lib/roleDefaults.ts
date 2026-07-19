import type { Role } from '../types'

/**
 * Figure label -> default role (R2/E29).
 * אבא/אמא/סבא/סבתא -> מבוגר ; בן/בת/אח/אחות/חיה -> ילד.
 * The label here is the Hebrew relationship word the user picks in the new-traveller
 * sheet (independent of the visual stamp glyph they choose).
 */
const ADULT_LABELS = ['אבא', 'אמא', 'סבא', 'סבתא'] as const
const CHILD_LABELS = ['בן', 'בת', 'אח', 'אחות', 'חיה'] as const

export const RELATION_LABELS = [...ADULT_LABELS, ...CHILD_LABELS] as const
export type RelationLabel = (typeof RELATION_LABELS)[number]

/** Returns the default role for a relation label; unknown labels default to 'ילד'. */
export function defaultRoleFor(label: string): Role {
  return (ADULT_LABELS as readonly string[]).includes(label) ? 'מבוגר' : 'ילד'
}
