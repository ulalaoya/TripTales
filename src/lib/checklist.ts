import type { ChecklistGroup, Role } from '../types'

/** Done/total counts for a single checklist group. */
export function groupProgress(group: ChecklistGroup): { done: number; total: number } {
  const total = group.items.length
  const done = group.items.reduce((n, it) => n + (it.done ? 1 : 0), 0)
  return { done, total }
}

/**
 * Aggregate progress across every group in a checklist.
 * `pct` is rounded to 0-100, and is 0 when there are no items.
 */
export function checklistProgress(
  checklist: ChecklistGroup[] | undefined,
): { done: number; total: number; pct: number } {
  let done = 0
  let total = 0
  for (const g of checklist ?? []) {
    const p = groupProgress(g)
    done += p.done
    total += p.total
  }
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return { done, total, pct }
}

/** Structural checklist edits (add/delete groups & items) are parent-only. */
export function canEditChecklist(role: Role): boolean {
  return role === 'מבוגר'
}

/** Toggling an item done/undone is allowed for everyone (both roles). */
export function canToggleItem(_role: Role): boolean {
  return true
}
