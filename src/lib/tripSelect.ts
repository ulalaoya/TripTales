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
 * Which day tab a trip should OPEN on (Galli feedback): today's day whenever the
 * trip is running, so during the trip you land on what is happening now.
 *
 * `days` is expected in date order (that is how `buildDays` produces them).
 * Resolution order:
 *   1. An exact match for `today`.
 *   2. Trip not started yet → the first day.
 *   3. Trip already over    → the last day.
 *   4. Today falls in a gap → the next day on or after today.
 */
export function initialDayIndex(days: { date: string }[], today: string): number {
  if (!Array.isArray(days) || days.length === 0) return 0

  const exact = days.findIndex((d) => d.date === today)
  if (exact >= 0) return exact

  if (today < days[0].date) return 0
  if (today > days[days.length - 1].date) return days.length - 1

  const next = days.findIndex((d) => d.date >= today)
  return next >= 0 ? next : days.length - 1
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
