import type { Role } from '../types'

/**
 * Adding a packing item is open to EVERY trip member — adults and children
 * alike (Galli feedback #16). This is deliberately looser than
 * `canEditChecklist` (in `checklist.ts`), which stays parent-only and gates the
 * STRUCTURAL edits: deleting items/groups and adding groups.
 */
export function canAddChecklistItem(_role: Role): boolean {
  return true
}
