/**
 * Per-trip join codes (effective sharing).
 * The alphabet deliberately excludes visually ambiguous characters
 * (no I / L / O / 0 / 1) so codes are easy to read aloud and type.
 */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const JOIN_CODE_LENGTH = 6

/** Generate a fresh 6-character join code from the unambiguous alphabet. */
export function generateJoinCode(): string {
  let out = ''
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)
    out += JOIN_CODE_ALPHABET[idx]
  }
  return out
}

/** Trim, uppercase, and strip any spaces or dashes a user may have typed. */
export function normalizeJoinCode(raw: string): string {
  return (raw ?? '').trim().toUpperCase().replace(/[\s-]/g, '')
}

/** True when the normalized input is exactly 6 chars, all from the alphabet. */
export function isValidJoinCodeFormat(raw: string): boolean {
  const code = normalizeJoinCode(raw)
  if (code.length !== JOIN_CODE_LENGTH) return false
  for (const ch of code) {
    if (!JOIN_CODE_ALPHABET.includes(ch)) return false
  }
  return true
}
