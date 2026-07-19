import type { Figure } from '../types'
import { GLYPH_BY_ID } from '../data/avatars'

interface Props {
  figure: Figure
  /** Avatar background — a CSS gradient (see AVATAR_GRADIENTS). */
  color: string
  size?: number
  label?: string
}

/**
 * Gradient rounded-square avatar (R8): the member's chosen mono-stroke glyph
 * drawn in white inside a gradient tile with a white border + soft shadow.
 */
export function Avatar({ figure, color, size = 44, label }: Props) {
  const glyph = GLYPH_BY_ID[figure]
  const glyphSize = Math.round(size * 0.58)
  return (
    <span
      className="av"
      style={{ background: color, width: size, height: size, borderRadius: Math.max(8, Math.round(size * 0.32)) }}
      role="img"
      aria-label={label ?? glyph?.label ?? 'avatar'}
    >
      <svg
        viewBox="0 0 24 24"
        width={glyphSize}
        height={glyphSize}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: glyph?.svg ?? '' }}
      />
    </span>
  )
}
