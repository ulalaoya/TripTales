/**
 * Trip-date validation for the wizard (Galli feedback #6): a new trip departs
 * today or later, and returns on or after its departure date.
 */

const ISO = /^\d{4}-\d{2}-\d{2}$/

/**
 * Earliest allowed return date for a departure — the same day as departure
 * (single-day trips are valid). Returns '' when `startISO` is not a date.
 */
export function minReturnDate(startISO: string): string {
  const s = (startISO ?? '').trim()
  return ISO.test(s) ? s : ''
}

/**
 * True when the range is bookable: departure is today or later AND the return
 * is on/after departure. Any malformed or missing date is invalid.
 */
export function isValidTripRange(startISO: string, endISO: string, todayISO: string): boolean {
  const s = (startISO ?? '').trim()
  const e = (endISO ?? '').trim()
  const today = (todayISO ?? '').trim()
  if (!ISO.test(s) || !ISO.test(e) || !ISO.test(today)) return false
  // ISO 'YYYY-MM-DD' is lexicographically ordered, so string compare is safe.
  return s >= today && e >= s
}
