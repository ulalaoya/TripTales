/**
 * Phone → opaque lookup key (PURE — no deps, no DOM, no crypto, synchronous).
 *
 * WHY THIS EXISTS
 * ---------------
 * Anonymous sign-in is open to the world and this repo is public, so "signed
 * in" is effectively "anyone". A `members` collection that stores plaintext
 * phone numbers and allows `list` is a phone-number harvesting endpoint.
 *
 * So the real phone number NEVER leaves the device. It stays in localStorage
 * (where the user typed it) and the cloud only ever sees `phoneHash(phone)` —
 * enough to answer "which member document belongs to this phone?" without
 * carrying the number itself.
 *
 * WHAT THIS IS NOT
 * ----------------
 * This OBSCURES, it does not PROTECT. Israeli mobile numbers occupy a space of
 * roughly 10^8, so anyone who dumps the collection can brute-force the whole
 * space offline in seconds and recover the numbers. A slow KDF would not fix
 * that either — the number space is simply too small. The security property we
 * actually gain is narrow and worth stating plainly:
 *
 *   • plaintext phone numbers are never uploaded, never logged, never sat in a
 *     database backup, and never appear in a console/network trace;
 *   • a casual `getDocs(collection(db,'members'))` yields opaque hex, not a
 *     ready-made contact list.
 *
 * Deliberately NOT `crypto.subtle.digest` (SHA-256): that API is async and
 * unavailable on insecure origins, and the contract here is a pure synchronous
 * function. FNV-1a is used twice with different offset bases to produce 64 bits
 * of output, which is ample to avoid collisions among a family's handful of
 * members.
 */

import { normalizePhone } from './phone'

/** Fixed application pepper — domain-separates these hashes from any other use. */
const APP_PEPPER = 'triptales:v1:phone'

const FNV_PRIME = 0x01000193
const FNV_OFFSET_A = 0x811c9dc5
const FNV_OFFSET_B = 0x9dc5811c

/** 32-bit FNV-1a over the UTF-16 bytes of `input`. */
function fnv1a32(input: string, offset: number): number {
  let hash = offset >>> 0
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i)
    hash = Math.imul(hash ^ (code & 0xff), FNV_PRIME) >>> 0
    hash = Math.imul(hash ^ ((code >> 8) & 0xff), FNV_PRIME) >>> 0
  }
  return hash >>> 0
}

function hex8(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0')
}

/**
 * Stable 16-character hex lookup key for a phone number.
 *
 * - Normalises first, so `050-123-4567`, `050 123 4567` and `0501234567` all
 *   produce the SAME key.
 * - Deterministic: the same input always yields the same output, on every
 *   device and across releases (changing `APP_PEPPER` would orphan every
 *   existing member document, so it must not change).
 * - Total: any string is accepted and always yields 16 hex characters.
 */
export function phoneHash(rawPhone: string): string {
  const normalized = normalizePhone(typeof rawPhone === 'string' ? rawPhone : '')
  const seed = `${APP_PEPPER}:${normalized}`
  return hex8(fnv1a32(seed, FNV_OFFSET_A)) + hex8(fnv1a32(`${seed}:${normalized.length}`, FNV_OFFSET_B))
}
