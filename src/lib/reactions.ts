import type { Reacts } from '../types'

/** The only emojis allowed as reactions (R2–R4). */
export const ALLOWED_EMOJIS = ['❤️', '😂', '😮', '⭐', '🍦', '👍'] as const
export type AllowedEmoji = (typeof ALLOWED_EMOJIS)[number]

export function isAllowedEmoji(emoji: string): emoji is AllowedEmoji {
  return (ALLOWED_EMOJIS as readonly string[]).includes(emoji)
}

/**
 * Immutable per-user toggle of a reaction — EXCLUSIVE, like Facebook.
 *
 * A member holds at most ONE reaction on an item: choosing a different emoji
 * MOVES their reaction rather than adding a second one (Galli feedback — a
 * heart followed by a smiley used to leave both marked). Choosing the emoji
 * they already have removes it.
 *
 * Other members are never touched, and emojis outside the whitelist are ignored
 * (returns the input unchanged).
 */
export function toggleReact(reacts: Reacts, emoji: string, memberId: string): Reacts {
  if (!isAllowedEmoji(emoji)) return reacts

  const alreadyMine = (reacts[emoji] ?? []).includes(memberId)

  // Drop this member from every emoji first, dropping keys that become empty.
  const next: Reacts = {}
  for (const [key, list] of Object.entries(reacts)) {
    const without = list.filter((id) => id !== memberId)
    if (without.length > 0) next[key] = without
  }

  // Re-add them under the chosen emoji unless this was a toggle-off.
  if (!alreadyMine) next[emoji] = [...(next[emoji] ?? []), memberId]
  return next
}
