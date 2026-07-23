import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/useT'
import type { Trip } from '../types'
import { Icon } from './Icon'
import { Logo } from './Logo'

interface Props {
  trip: Trip
  /** Small screen name shown under the trip name (album, packing, settings…). */
  subtitle?: string
  /** Optional trailing control on the trip-name row (e.g. the settings pencil). */
  action?: ReactNode
}

/**
 * Shared in-trip screen header (Galli feedback #2, #3, #18):
 *  • a visible back control on the right (RTL) that returns to the trips list,
 *  • the small TripTales mark + wordmark pinned to the visual-left (Item 4) —
 *    kept small so the big, bold TRIP NAME below stays the screen's focal point,
 *  • the TRIP NAME as the big, bold focal point of every in-trip screen,
 *  • an optional small subtitle (the current screen's name).
 */
export function TripHeader({ trip, subtitle, action }: Props) {
  const t = useT()
  const navigate = useNavigate()

  return (
    <header className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => navigate('/trips')}
          className="tap inline-flex items-center gap-1 text-[var(--ink)]"
        >
          <Icon name="chevron" size={18} className="dir-back" />
          {t('back')}
        </button>
        <Logo size="sm" />
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon
            name={trip.transport === 'flight' ? 'plane' : 'car'}
            size={24}
            directional
            className="text-[var(--coral)] shrink-0"
          />
          <h1 className="text-3xl font-extrabold leading-tight truncate">{trip.name}</h1>
        </div>
        {action}
      </div>
      {subtitle && <p className="text-sm text-[var(--muted)] mt-1">{subtitle}</p>}
    </header>
  )
}
