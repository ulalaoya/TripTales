/**
 * Data-URL size arithmetic (PURE — no DOM, no firebase).
 *
 * A Firestore document is capped at 1 MiB (1_048_576 bytes) INCLUDING field
 * names, indexes and overhead, so we keep photos comfortably below that with a
 * 900 KB budget for the image payload itself.
 */

/** Firestore's hard per-document ceiling is 1 MiB; we leave headroom. */
export const FIRESTORE_PHOTO_BUDGET = 900_000

/** UTF-8 byte length of a string, without depending on TextEncoder. */
function utf8Length(s: string): number {
  let bytes = 0
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate — a full code point is 4 bytes; skip its low surrogate.
      bytes += 4
      i++
    } else bytes += 3
  }
  return bytes
}

/**
 * Decoded byte size of a data URL's payload.
 *
 * - `data:image/jpeg;base64,...` → the decoded binary size, padding `=` handled.
 * - `data:text/plain,...`        → the UTF-8 size of the (percent-decoded) text.
 * - Anything that is not a data URL (including `''` and non-strings) → `0`.
 */
export function dataUrlBytes(dataUrl: string): number {
  if (typeof dataUrl !== 'string') return 0
  if (!/^data:/i.test(dataUrl)) return 0

  const comma = dataUrl.indexOf(',')
  if (comma < 0) return 0

  const meta = dataUrl.slice(5, comma) // between "data:" and ","
  const payload = dataUrl.slice(comma + 1)

  if (/;base64\s*$/i.test(meta)) {
    const b64 = payload.replace(/\s/g, '')
    if (b64.length === 0) return 0
    const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
    return Math.max(0, Math.floor((b64.length * 3) / 4) - pad)
  }

  try {
    return utf8Length(decodeURIComponent(payload))
  } catch {
    return utf8Length(payload)
  }
}

/** True when the data URL's payload fits inside the per-photo Firestore budget. */
export function withinFirestoreLimit(dataUrl: string): boolean {
  return dataUrlBytes(dataUrl) < FIRESTORE_PHOTO_BUDGET
}
