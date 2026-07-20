import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { useT } from '../i18n/useT'
import type { StringKey } from '../i18n'

/**
 * Contextual bottom tab bar — rendered ONLY inside a trip (`/trips/:tripId/*`).
 * Tabs: תכנון · אלבום · ➕ (raised center) · ציוד · משתתפים.
 */
export function TripBottomNav({ tripId }: { tripId: string }) {
  const t = useT()
  const base = `/trips/${tripId}`
  return (
    <nav
      className="bottom-nav sticky z-30 bottom-2 mx-2 mb-2 grid grid-cols-5 items-center p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      aria-label={t('navPlan')}
    >
      <NavItem to={base} end icon="calendar" labelKey="navPlan" t={t} />
      <NavItem to={`${base}/album`} icon="album" labelKey="navAlbum" t={t} />
      {/* ➕ רגע חדש — raised center, both roles, scoped to THIS trip */}
      <NavLink to={`${base}/moment`} aria-label={t('navMoment')} className="nav-add tap">
        <Icon name="plus" size={26} />
      </NavLink>
      <NavItem to={`${base}/checklist`} icon="checkSquare" labelKey="navGear" t={t} />
      <NavItem to={`${base}/people`} icon="users" labelKey="navPeople" t={t} />
    </nav>
  )
}

function NavItem({
  to,
  icon,
  labelKey,
  end,
  t,
}: {
  to: string
  icon: IconName
  labelKey: StringKey
  end?: boolean
  t: ReturnType<typeof useT>
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `nav-item tap flex flex-col items-center justify-center gap-1 py-2 ${isActive ? 'active' : ''}`
      }
    >
      <Icon name={icon} size={22} />
      <span className="text-[10px] font-semibold">{t(labelKey)}</span>
    </NavLink>
  )
}
