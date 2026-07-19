import type { Reacts } from '../types'
import { ALLOWED_EMOJIS } from '../lib/reactions'

interface Props {
  reacts: Reacts
  memberId: string
  onToggle: (emoji: string) => void
}

/** Emoji reaction bar (❤️😂😮⭐🍦👍). Toggles per member; both roles may react. */
export function ReactionBar({ reacts, memberId, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {ALLOWED_EMOJIS.map((emoji) => {
        const list = reacts[emoji] ?? []
        const mine = list.includes(memberId)
        const count = list.length
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            aria-pressed={mine}
            aria-label={emoji}
            className={`tap inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition ${
              mine
                ? 'bg-[var(--coral-soft)] border-[var(--coral)] text-[var(--coral)]'
                : 'bg-white border-[var(--line)]'
            }`}
          >
            <span aria-hidden>{emoji}</span>
            {count > 0 && <span className="text-xs font-bold">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
