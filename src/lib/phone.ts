/**
 * Phone helpers (R1).
 * Israeli phone validation after stripping spaces and dashes.
 */

export const ISRAELI_PHONE_RE = /^0(5\d|[2-4]|[8-9]|7\d)\d{7}$/

/** Strip spaces and dashes (and other common separators) from a raw phone string. */
export function normalizePhone(raw: string): string {
  return (raw ?? '').replace(/[\s-]/g, '')
}

/** True when the normalized value is a valid Israeli phone number. */
export function isValidIsraeliPhone(raw: string): boolean {
  return ISRAELI_PHONE_RE.test(normalizePhone(raw))
}
