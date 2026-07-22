/**
 * Day-tab date formatting (Galli feedback #1 + #11): day tabs are navigated by
 * DATE, not by an ordinal index. The day's NAME stays, shown as the heading
 * inside the day view.
 */

/** Hebrew single-letter weekday names, Sunday-first (matches Date#getUTCDay). */
const HEB_WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'] as const

/** Parse an ISO 'YYYY-MM-DD' into UTC parts; null when malformed. */
function parseISO(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? '').trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(y, mo - 1, d))
  // Reject rollovers like 2026-02-31.
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return { y, m: mo, d }
}

/**
 * Hebrew weekday letter for an ISO date, e.g. '2026-08-10' (a Monday) -> 'ב׳'.
 * Returns '' for a malformed date.
 */
export function hebrewWeekday(iso: string): string {
  const p = parseISO(iso)
  if (!p) return ''
  const dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()
  return HEB_WEEKDAYS[dow]
}

/**
 * Day-tab label: Hebrew weekday + day.month with no leading zeros.
 * '2026-08-10' -> 'ב׳ · 10.8'. Returns '' for a malformed date.
 */
export function dayTabLabel(iso: string): string {
  const p = parseISO(iso)
  if (!p) return ''
  return `${hebrewWeekday(iso)} · ${p.d}.${p.m}`
}

/**
 * Full Hebrew weekday WORD for an ISO date — the single-letter `hebrewWeekday`
 * prefixed with 'יום ': '2026-08-10' (a Monday) -> 'יום ב׳'. Returns '' for a
 * malformed date. Used for the two-line day tabs (Galli feedback #4).
 */
export function weekdayWord(iso: string): string {
  const w = hebrewWeekday(iso)
  return w ? `יום ${w}` : ''
}

/**
 * Just the day.month part of a date, no leading zeros: '2026-08-10' -> '10.8'.
 * The bottom line of a two-line day tab. Returns '' for a malformed date.
 */
export function dayMonth(iso: string): string {
  const p = parseISO(iso)
  if (!p) return ''
  return `${p.d}.${p.m}`
}
