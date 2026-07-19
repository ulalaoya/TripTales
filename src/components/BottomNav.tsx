import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { useT } from '../i18n/useT'
import type { StringKey } from '../i18n'
import { useStore } from '../store/useStore'
import { primaryTrip, todayISO } from '../lib/tripSelect'

export function BottomNav() {
  const t = useT()
  const trips = useStore((s) => s.trips)
  const primary = primaryTrip(trips, todayISO())
  const planTo = primary ? `/trips/${primary.id}` : '/trips'

  return (
    <nav
      className="bottom-nav sticky z-30 bottom-2 mx-2 mb-2 grid grid-cols-5 items-center p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      aria-label={t('navHome')}
    >
      <NavItem to="/home" icon="home" labelKey="navHome" t={t} />
      <NavItem to={planTo} icon="calendar" labelKey="navPlan" t={t} />
      {/* ➕ רגע חדש — raised center, both roles */}
      <NavLink to="/moment" aria-label={t('navMoment')} className="nav-add tap">
        <Icon name="plus" size={26} />
      </NavLink>
      <NavItem to="/album" icon="album" labelKey="navAlbum" t={t} />
      <NavItem to="/family" icon="users" labelKey="navFamily" t={t} />
    </nav>
  )
}

function NavItem({
  to,
  icon,
  labelKey,
  t,
}: {
  to: string
  icon: IconName
  labelKey: StringKey
  t: ReturnType<typeof useT>
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `nav-item tap flex flex-col items-center justify-center gap-1 py-2 ${isActive ? 'active' : ''}`
      }
    >
      <Icon name={icon} size={22} />
      <span className="text-[10px] font-semibold">{t(labelKey)}</span>
    </NavLink>
  )
}
