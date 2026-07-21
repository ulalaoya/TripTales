import { useId } from 'react'
import { useT } from '../i18n/useT'
import { locationHref, locationLabel } from '../lib/locationLink'
import { Icon } from './Icon'

interface Props {
  value: string
  onChange: (v: string) => void
}

/**
 * The location→navigation field (Galli feedback #4 + #10). Discoverable by
 * design: an explicit label, a map-pin inside the field, helper text about
 * pasting Maps/Waze links, and a live preview chip of the resulting navigation
 * link. Use this EVERYWHERE a location is entered.
 */
export function LocationField({ value, onChange }: Props) {
  const t = useT()
  const id = useId()
  const helpId = `${id}-help`
  const trimmed = value.trim()

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {t('locNavLabel')}
      </label>
      <div className="relative">
        <span
          className="absolute top-0 h-full grid place-items-center text-[var(--sea)] pointer-events-none"
          style={{ width: 40, insetInlineStart: 0 }}
          aria-hidden
        >
          <Icon name="mapPin" size={18} />
        </span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={helpId}
          placeholder={t('locNavLabel')}
          className="tap w-full rounded-[14px] py-2.5 bg-white border border-[var(--line)] outline-none text-sm"
          style={{ paddingInlineStart: 40, paddingInlineEnd: 12 }}
        />
      </div>
      <p id={helpId} className="text-[11px] text-[var(--muted)] mt-1">
        {t('locNavHelp')}
      </p>
      {trimmed && (
        <a
          href={locationHref(trimmed)}
          target="_blank"
          rel="noopener"
          className="tap-chip gap-1 mt-1.5 text-xs text-[var(--sea)] font-semibold"
        >
          <Icon name="mapPin" size={14} />
          <bdi>{locationLabel(trimmed)}</bdi>
        </a>
      )}
    </div>
  )
}
