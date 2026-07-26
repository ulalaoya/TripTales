import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Reacts } from '../types'
import { ALLOWED_EMOJIS } from '../lib/reactions'
import { useT } from '../i18n/useT'
import { Icon } from './Icon'

interface Props {
  reacts: Reacts
  memberId: string
  onToggle: (emoji: string) => void
}

/** Gap between the trigger and the picker, and the minimum viewport margin. */
const GAP = 6
const MARGIN = 8

/**
 * Facebook-style reaction control (Galli feedback): ONE small marker in the
 * corner of a photo. It shows the emojis people picked plus a total, or a plain
 * uncoloured thumbs-up outline when nobody has reacted yet.
 *
 * The picker is positioned as `position: fixed` and CLAMPED to the viewport, so
 * every emoji stays reachable even for tiles in the outer grid column — anchored
 * purely in CSS it was running off the screen edge and hiding choices.
 *
 * Reactions are exclusive per member (see `lib/reactions.toggleReact`), so the
 * emoji shown for you is always your single current choice.
 */
export function ReactionBar({ reacts, memberId, onToggle }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const mine = ALLOWED_EMOJIS.find((e) => (reacts[e] ?? []).includes(memberId))
  const active = ALLOWED_EMOJIS.filter((e) => (reacts[e] ?? []).length > 0)
  const total = active.reduce((sum, e) => sum + (reacts[e] ?? []).length, 0)

  // Measure once open, then clamp inside the viewport (flipping below the
  // trigger when there is no room above).
  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const btn = btnRef.current
    const pop = popRef.current
    if (!btn || !pop) return
    const b = btn.getBoundingClientRect()
    const p = pop.getBoundingClientRect()
    const maxLeft = Math.max(MARGIN, window.innerWidth - p.width - MARGIN)
    const left = Math.min(Math.max(b.left + b.width / 2 - p.width / 2, MARGIN), maxLeft)
    const above = b.top - p.height - GAP
    setPos({ top: above >= MARGIN ? above : b.bottom + GAP, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onDown = (ev: Event) => {
      if (!wrapRef.current?.contains(ev.target as Node) && !popRef.current?.contains(ev.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    // Fixed positioning does not follow the page, so dismiss on scroll/resize.
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
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
        <div
          ref={popRef}
          className="reaction-pop"
          role="menu"
          aria-label={t('reactLabel')}
          style={{
            top: pos?.top ?? 0,
            left: pos?.left ?? 0,
            // Hidden for the single measuring frame, so it never flashes.
            visibility: pos ? 'visible' : 'hidden',
          }}
        >
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
