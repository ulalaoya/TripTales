import { mapsUrl } from './maps'

/**
 * Location → navigation link (Galli feedback #4 + #10). A location field now
 * accepts EITHER a plain place name (→ Google Maps search) or a pasted
 * Google Maps / Waze link (→ used as-is, so shared pins keep working).
 */

/** True when `raw` is an http(s) URL — a pasted Maps/Waze (or any) link. */
export function isMapsUrl(raw: string): boolean {
  const s = (raw ?? '').trim()
  if (!/^https?:\/\//i.test(s)) return false
  // A bare scheme with no host is not a usable link.
  return /^https?:\/\/\S+$/i.test(s) && s.replace(/^https?:\/\//i, '').length > 0
}

/** The href to navigate to: a pasted link as-is, otherwise a Maps search. */
export function locationHref(raw: string): string {
  const s = (raw ?? '').trim()
  return isMapsUrl(s) ? s : mapsUrl(s)
}

/** Chip label: the place name itself, or a friendly label for a pasted link. */
export function locationLabel(raw: string): string {
  const s = (raw ?? '').trim()
  return isMapsUrl(s) ? 'פתיחה בניווט' : s
}
