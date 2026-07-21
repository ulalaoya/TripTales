import type { Activity, Day, Transport } from '../types'

/**
 * Galli feedback #9: the old fixed "המראה/נחיתה" (flight) and
 * "יוצאים לדרך/חוזרים הביתה" (drive) cards could not be edited. They are gone;
 * instead a NEW trip is seeded with real, editable activities on its first and
 * last day. Existing trips are untouched (no migration) — the Galilee and
 * Santorini seeds already carry their own opening/closing legs.
 */

/** The seeded opening/closing activity for each transport mode. */
const SEEDS: Record<Transport, { first: Omit<Activity, 'id'>; last: Omit<Activity, 'id'> }> = {
  flight: {
    first: { title: 'המראה', icon: '✈️' },
    last: { title: 'נחיתה', icon: '✈️' },
  },
  drive: {
    first: { title: 'יציאה', icon: '🚗' },
    last: { title: 'חזרה הביתה', icon: '🚗' },
  },
}

/** The opening/closing activity templates for a transport mode (no time). */
export function transportSeedActivities(
  transport: Transport,
): { first: Omit<Activity, 'id'>; last: Omit<Activity, 'id'> } {
  return SEEDS[transport] ?? SEEDS.drive
}

/**
 * Immutably prepend the opening leg to the first day and append the closing leg
 * to the last day. A single-day trip gets both, in order. Empty input passes
 * straight through.
 */
export function seedTransportActivities(days: Day[], transport: Transport): Day[] {
  if (days.length === 0) return days
  const { first, last } = transportSeedActivities(transport)
  const lastIdx = days.length - 1
  return days.map((d, i) => {
    const extra: Activity[] = []
    if (i === 0) extra.push({ ...first, id: `${d.id}-a-start` })
    if (i === lastIdx) extra.push({ ...last, id: `${d.id}-a-end` })
    return extra.length > 0 ? { ...d, activities: [...d.activities, ...extra] } : d
  })
}
