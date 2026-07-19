import type { Trip } from '../types'
import { tripStatus } from './tripStatus'

/** Today's local date as an ISO 'YYYY-MM-DD' string. */
export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Pick the "primary" trip to feature on Home / the Plan nav target:
 * the nearest upcoming-or-active real trip (ignoring ideas). Falls back to the
 * most recently ended trip, then any trip. Returns undefined when there are none.
 */
export function primaryTrip(trips: Trip[], today: string): Trip | undefined {
  const real = trips.filter((t) => t.idea !== true)
  if (real.length === 0) return trips[0]

  const active = real.filter((t) => tripStatus(t, today) === 'active')
  if (active.length > 0) {
    return [...active].sort((a, b) => a.startDate.localeCompare(b.startDate))[0]
  }
  const planned = real.filter((t) => tripStatus(t, today) === 'planned')
  if (planned.length > 0) {
    return [...planned].sort((a, b) => a.startDate.localeCompare(b.startDate))[0]
  }
  // all ended → most recently finished
  return [...real].sort((a, b) => b.endDate.localeCompare(a.endDate))[0]
}
