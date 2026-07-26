import { useEffect, useRef, useState } from 'react'
import type { Reacts } from '../types'
import { ALLOWED_EMOJIS } from '../lib/reactions'
import { useT } from '../i18n/useT'

interface Props {
  reacts: Reacts
  memberId: string
  onToggle: (emoji: string) => void
}

/**
 * Facebook-style reactions (Galli feedback): a single 👍 button that opens the
 * full emoji picker on tap, instead of six buttons always on screen.
 *
 * - The trigger shows YOUR reaction once you have one (👍 otherwise).
 * - Reactions that already exist stay visible next to it as compact counters,
 *   so you can see and toggle them without opening the picker.
 * - The picker closes on selection, on Escape, and on a tap outside.
 */
export function ReactionBar({ reacts, memberId, onToggle }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const mine = ALLOWED_EMOJIS.find((e) => (reacts[e] ?? []).includes(memberId))
  const active = ALLOWED_EMOJIS.filter((e) => (reacts[e] ?? []).length > 0)

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

  const pillClass = (on: boolean) =>
    `tap inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition ${
      on
        ? 'bg-[var(--coral-soft)] border-[var(--coral)] text-[var(--coral)]'
        : 'bg-white border-[var(--line)]'
    }`

  return (
    <div ref={wrapRef} className="relative mt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={t('reactLabel')}
          className={pillClass(!!mine)}
        >
          <span aria-hidden>{mine ?? '👍'}</span>
          <span className="text-xs font-bold">{t('reactLabel')}</span>
        </button>

        {active.map((emoji) => {
          const list = reacts[emoji] ?? []
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => onToggle(emoji)}
              aria-pressed={list.includes(memberId)}
              aria-label={emoji}
              className={pillClass(list.includes(memberId))}
            >
              <span aria-hidden>{emoji}</span>
              <span className="text-xs font-bold">{list.length}</span>
            </button>
          )
        })}
      </div>

      {open && (
        <div className="reaction-pop" role="menu" aria-label={t('reactLabel')}>
          {ALLOWED_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="menuitem"
              onClick={() => {
                onToggle(emoji)
                setOpen(false)
              }}
              aria-label={emoji}
              className="reaction-pop-btn tap"
            >
              <span aria-hidden>{emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
