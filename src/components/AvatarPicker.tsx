import { useState } from 'react'
import type { Figure } from '../types'
import { AVSETS, AVATAR_GRADIENTS } from '../data/avatars'
import { Avatar } from './Avatar'

interface Props {
  figure: Figure
  color: string
  onFigure: (f: Figure) => void
  onColor: (c: string) => void
}

/** Shared picker (onboarding + profile): set pills -> 4-col labelled grid -> gradient row. */
export function AvatarPicker({ figure, color, onFigure, onColor }: Props) {
  const activeSetIdx = Math.max(
    0,
    AVSETS.findIndex((s) => s.glyphs.some((g) => g.id === figure)),
  )
  const [setIdx, setSetIdx] = useState(activeSetIdx)
  const set = AVSETS[setIdx]

  return (
    <div className="space-y-3">
      {/* Set pills — segmented toggle (active = ink). */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="קבוצות דמויות">
        {AVSETS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === setIdx}
            onClick={() => setSetIdx(i)}
            className={`tap px-3 py-1.5 rounded-[14px] text-sm font-medium border transition ${
              i === setIdx
                ? 'bg-[var(--ink)] text-white border-transparent'
                : 'bg-white text-[var(--ink)] border-[var(--line)]'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* 4-col labelled glyph grid */}
      <div className="grid grid-cols-4 gap-2">
        {set.glyphs.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onFigure(g.id)}
            aria-pressed={g.id === figure}
            aria-label={g.label}
            className={`tap flex flex-col items-center gap-1 p-1.5 rounded-[14px] border transition ${
              g.id === figure ? 'border-[var(--coral)] bg-[var(--coral-soft)]' : 'border-transparent'
            }`}
          >
            <Avatar figure={g.id} color={color} size={40} />
            <span className="text-[10px] leading-tight text-[var(--muted)]">{g.label}</span>
          </button>
        ))}
      </div>

      {/* Gradient choice row */}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="צבע דמות">
        {AVATAR_GRADIENTS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={c}
            onClick={() => onColor(c)}
            className={`tap rounded-[14px] border-2 ${c === color ? 'border-[var(--coral)]' : 'border-transparent'}`}
            style={{ width: 44, height: 44, padding: 4 }}
          >
            <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: 11, background: c }} />
          </button>
        ))}
      </div>
    </div>
  )
}
