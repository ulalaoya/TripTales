import type { Trip } from '../types'
import type { Lang } from '../i18n'

export type TripStatus = 'idea' | 'planned' | 'active' | 'ended'

/**
 * Derive a trip's status from its `idea` flag and its date range relative to
 * `todayISO` (a 'YYYY-MM-DD' string):
 *   - 'idea'    when trip.idea === true
 *   - 'active'  when todayISO is within [startDate, endDate] inclusive
 *   - 'planned' when startDate is after today
 *   - 'ended'   when endDate is before today
 * Comparison is lexicographic on ISO date strings (safe for 'YYYY-MM-DD').
 */
export function tripStatus(trip: Trip, todayISO: string): TripStatus {
  if (trip.idea === true) return 'idea'
  if (trip.endDate < todayISO) return 'ended'
  if (trip.startDate > todayISO) return 'planned'
  return 'active'
}

const LABELS: Record<Lang, Record<TripStatus, string>> = {
  he: { idea: 'רעיונות', planned: 'מתוכננים', active: 'פעיל', ended: 'הסתיימו' },
  en: { idea: 'Ideas', planned: 'Planned', active: 'Active', ended: 'Ended' },
}

/** Localized label for a status (matches the Trips-screen tab wording). */
export function statusLabel(status: TripStatus, lang: Lang): string {
  return LABELS[lang][status]
}

const TAG_LABELS: Record<Lang, Record<TripStatus, string>> = {
  he: { idea: 'רעיון', planned: 'מתוכנן', active: 'פעיל', ended: 'הסתיים' },
  en: { idea: 'Idea', planned: 'Planned', active: 'Active', ended: 'Ended' },
}

/**
 * Singular status label for a single trip's tag chip (trip cards).
 * The plural `statusLabel` wording is for the filter tabs only.
 */
export function statusTag(status: TripStatus, lang: Lang): string {
  return TAG_LABELS[lang][status]
}
