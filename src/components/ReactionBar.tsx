import { useEffect, useRef, useState } from 'react'
import type { Reacts } from '../types'
import { ALLOWED_EMOJIS } from '../lib/reactions'
import { useT } from '../i18n/useT'
import { Icon } from './Icon'

interface Props {
  reacts: Reacts
  memberId: string
  onToggle: (emoji: string) => void
}

/**
 * Facebook-style reaction control (Galli feedback): ONE small marker that sits
 * in the corner of a photo. It shows the emojis people picked plus a total, or
 * a plain uncoloured thumbs-up outline when nobody has reacted yet — never a
 * "הגיבו" caption. Tapping it opens the emoji picker.
 *
 * Reactions are exclusive per member (see `lib/reactions.toggleReact`), so the
 * emoji shown for you is always your single current choice.
 */
export function ReactionBar({ reacts, memberId, onToggle }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const mine = ALLOWED_EMOJIS.find((e) => (reacts[e] ?? []).includes(memberId))
  const active = ALLOWED_EMOJIS.filter((e) => (reacts[e] ?? []).length > 0)
  const total = active.reduce((sum, e) => sum + (reacts[e] ?? []).length, 0)

  useEffect(() => {
    if (!open) return
    const onDown = (ev: Event) => {
      if (!wrapRef.current?.contains(ev.target as Node)) setOpen(false)
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('reactLabel')}
        className={`tap reaction-chip ${mine ? 'is-mine' : ''}`}
      >
        {active.length === 0 ? (
          <Icon name="thumb" size={17} className="text-[var(--muted)]" />
        ) : (
          <>
            <span aria-hidden>{active.join('')}</span>
            <span className="reaction-count">{total}</span>
          </>
        )}
      </button>

      {open && (
        <div className="reaction-pop" role="menu" aria-label={t('reactLabel')}>
          {ALLOWED_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="menuitem"
              aria-label={emoji}
              aria-pressed={mine === emoji}
              onClick={() => {
                onToggle(emoji)
                setOpen(false)
              }}
              className={`reaction-pop-btn tap ${mine === emoji ? 'is-mine' : ''}`}
            >
              <span aria-hidden>{emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
