import { Link, useNavigate, useParams, Navigate } from 'react-router-dom'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { mapsUrl } from '../lib/maps'
import type { Trip, Day } from '../types'
import { Icon } from '../components/Icon'

function stubLabel(trip: Trip, isFirst: boolean, t: ReturnType<typeof useT>): string {
  if (trip.transport === 'flight') return isFirst ? t('takeoff') : t('landing')
  return isFirst ? t('departByCar') : t('returnHome')
}

export function TripView() {
  const t = useT()
  const navigate = useNavigate()
  const { tripId } = useParams()
  const member = useCurrentMember()!
  const trip = useStore((s) => s.trips.find((x) => x.id === tripId))

  if (!trip) return <Navigate to="/trips" replace />
  const isParent = member.role === 'מבוגר'

  function dayPending(d: Day) {
    return d.photos.filter((p) => p.status === 'pending').length
  }

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <button
          type="button"
          onClick={() => navigate('/trips')}
          className="tap inline-flex items-center gap-1 text-[var(--ink-fountain)] mb-4"
        >
          <Icon name="chevron" size={18} className="dir-back" />
          {t('back')}
        </button>

        {/* Trip header */}
        <div className="flex items-center gap-2 mb-1">
          <Icon
            name={trip.transport === 'flight' ? 'plane' : 'car'}
            size={26}
            directional
            className="text-[var(--ink-red)]"
          />
          <h1 className="font-hand text-2xl">{trip.name}</h1>
        </div>
        <div className="text-sm font-mono text-[var(--ink-pencil)] mb-2">
          <bdi>
            {trip.startDate} – {trip.endDate}
          </bdi>
        </div>
        <a
          href={mapsUrl(trip.destination)}
          target="_blank"
          rel="noopener"
          className="tap-chip gap-1 text-sm text-[var(--ink-fountain)] underline decoration-dotted mb-5"
        >
          <Icon name="mapPin" size={16} />
          <bdi>{trip.destination}</bdi>
        </a>

        {/* Days */}
        <ul className="space-y-3">
          {trip.days.map((d, i) => {
            const isFirst = i === 0
            const isLast = i === trip.days.length - 1
            const isStub = isFirst || isLast
            const pending = dayPending(d)
            return (
              <li key={d.id}>
                <Link
                  to={`/trips/${trip.id}/day/${d.id}`}
                  className={`block p-4 rounded-lg ${isStub ? 'ticket-stub' : 'trip-card'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isStub && (
                        <Icon
                          name={trip.transport === 'flight' ? 'plane' : 'car'}
                          size={22}
                          directional
                          className="text-[var(--ink-red)] shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="font-hand text-lg truncate">
                          {isStub ? stubLabel(trip, isFirst, t) : d.title}
                        </div>
                        <div className="text-xs font-mono text-[var(--ink-pencil)]">
                          <bdi>{d.date}</bdi>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isParent && pending > 0 && (
                        <span className="text-xs font-bold text-[var(--paper-cream)] bg-[var(--ink-red)] rounded-full px-2 py-0.5">
                          {pending}
                        </span>
                      )}
                      <span className="text-xs text-[var(--ink-pencil)]">
                        {d.entries.length} · {d.photos.length}
                      </span>
                      <Icon name="chevron" size={18} directional className="text-[var(--ink-pencil)]" />
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
