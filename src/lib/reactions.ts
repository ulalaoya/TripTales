import type { Reacts } from '../types'

/** The only emojis allowed as reactions (R2–R4). */
export const ALLOWED_EMOJIS = ['❤️', '😂', '😮', '⭐', '🍦', '👍'] as const
export type AllowedEmoji = (typeof ALLOWED_EMOJIS)[number]

export function isAllowedEmoji(emoji: string): emoji is AllowedEmoji {
  return (ALLOWED_EMOJIS as readonly string[]).includes(emoji)
}

/**
 * Immutable per-user toggle of a reaction.
 * If `memberId` already reacted with `emoji` it is removed, otherwise added.
 * Emojis outside the whitelist are ignored (returns the input unchanged).
 */
export function toggleReact(reacts: Reacts, emoji: string, memberId: string): Reacts {
  if (!isAllowedEmoji(emoji)) return reacts

  const current = reacts[emoji] ?? []
  const has = current.includes(memberId)
  const nextList = has ? current.filter((id) => id !== memberId) : [...current, memberId]

  const next: Reacts = { ...reacts }
  if (nextList.length === 0) {
    delete next[emoji]
  } else {
    next[emoji] = nextList
  }
  return next
}
