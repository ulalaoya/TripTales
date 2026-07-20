import type { Day } from '../types'

/** True when a day holds any user content (activities, journal entries, photos). */
export function hasContent(d: Day): boolean {
  return d.activities.length > 0 || d.entries.length > 0 || d.photos.length > 0
}

/**
 * Build the day list for a date range, reusing any existing day that falls on
 * the same date (so its content is preserved). New days start empty.
 * Returns `existing` unchanged when the range is invalid.
 */
export function buildDays(start: string, end: string, existing: Day[]): Day[] {
  const s = new Date(start)
  const e = new Date(end)
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return existing
  const days: Day[] = []
  let i = 0
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1), i++) {
    const iso = d.toISOString().slice(0, 10)
    const prev = existing.find((x) => x.date === iso)
    days.push(
      prev ?? { id: `d-${iso}-${i}`, date: iso, title: `יום ${i + 1}`, activities: [], entries: [], photos: [] },
    )
  }
  return days
}

/**
 * Existing days that would be dropped by a new date range AND still hold
 * content — the ones a shrink must confirm before deleting.
 */
export function daysLostWithContent(start: string, end: string, existing: Day[]): Day[] {
  const kept = new Set(buildDays(start, end, existing).map((d) => d.date))
  return existing.filter((d) => !kept.has(d.date) && hasContent(d))
}
