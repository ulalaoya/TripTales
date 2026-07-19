import { Icon } from './Icon'

interface Props {
  /** Kept for API compatibility; both render the mark + wordmark. */
  variant?: 'plaque' | 'emboss'
  size?: 'sm' | 'md' | 'lg'
}

const MARK = { sm: 34, md: 42, lg: 66 }
const WORD = { sm: '1.15rem', md: '1.4rem', lg: '2.1rem' }
const GLYPH = { sm: 18, md: 22, lg: 34 }

/**
 * Logo is NEVER plain text: a coral rounded-square brand mark (white paper-plane
 * glyph) next to the "TripTales" wordmark in Assistant 800.
 */
export function Logo({ size = 'md' }: Props) {
  const mark = MARK[size]
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="brand-mark" style={{ width: mark, height: mark }}>
        <Icon name="plane" size={GLYPH[size]} directional />
      </span>
      <span className="wordmark" style={{ fontSize: WORD[size] }}>
        TripTales
      </span>
    </span>
  )
}
