import type { Activity } from '../types'

/**
 * Auto-sort a day's activities (Galli feedback #9: "the time determines the
 * rest of the day"). Activities WITH a time sort ascending; activities WITHOUT
 * a time keep their manual (drag) order and follow the timed ones.
 *
 * Always immutable — the input array is never mutated.
 */

/** Minutes since midnight for an 'H:MM' / 'HH:MM' string; null when unusable. */
function minutesOf(time: string | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((time ?? '').trim())
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  if (h > 23 || mi > 59) return null
  return h * 60 + mi
}

export function sortActivitiesByTime(list: Activity[]): Activity[] {
  const timed: { a: Activity; at: number }[] = []
  const untimed: Activity[] = []
  for (const a of list) {
    const at = minutesOf(a.time)
    if (at === null) untimed.push(a)
    else timed.push({ a, at })
  }
  // Array#sort is stable in ES2019+, so equal times keep their relative order.
  timed.sort((x, y) => x.at - y.at)
  return [...timed.map((x) => x.a), ...untimed]
}
