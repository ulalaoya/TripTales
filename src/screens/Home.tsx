import { Link } from 'react-router-dom'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { mapsUrl } from '../lib/maps'
import { checklistProgress } from '../lib/checklist'
import { primaryTrip, todayISO } from '../lib/tripSelect'
import type { Trip, Day, Photo, Member } from '../types'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'

function dayCount(trip: Trip): number {
  return trip.days.length
}

/** First approved photo across the trip — used as the hero cover if present. */
function coverPhoto(trip: Trip): Photo | undefined {
  for (const d of trip.days) {
    const p = d.photos.find((x) => x.status === 'approved')
    if (p) return p
  }
  return undefined
}

function totalReacts(reacts: Record<string, string[]>): number {
  return Object.values(reacts).reduce((n, l) => n + l.length, 0)
}

interface Pulse {
  emoji: string
  caption: string
  by?: string
  reacts: Record<string, string[]>
  dayId: string
}

/** Most-reacted approved photo or entry in the trip. */
function findPulse(trip: Trip): Pulse | undefined {
  let best: Pulse | undefined
  let bestScore = -1
  for (const d of trip.days) {
    for (const p of d.photos) {
      if (p.status !== 'approved') continue
      const score = totalReacts(p.reacts)
      if (score > bestScore) {
        bestScore = score
        best = { emoji: p.mood ?? '📸', caption: p.caption, by: p.by, reacts: p.reacts, dayId: d.id }
      }
    }
    for (const e of d.entries) {
      const score = totalReacts(e.reacts)
      if (score > bestScore) {
        bestScore = score
        best = { emoji: e.mood, caption: e.text, by: e.author, reacts: e.reacts, dayId: d.id }
      }
    }
  }
  return best
}

export function Home() {
  const t = useT()
  const member = useCurrentMember()!
  const members = useStore((s) => s.members)
  const trips = useStore((s) => s.trips)
  const isParent = member.role === 'מבוגר'

  const trip = primaryTrip(trips, todayISO())
  const hour = new Date().getHours()
  const greeting =
    hour >= 5 && hour < 18 ? t.fn('greetMorning')(member.name) : t.fn('greetEvening')(member.name)

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        {/* Greeting header */}
        <header className="flex items-center gap-3 mb-5">
          <Avatar figure={member.figure} color={member.color} size={44} />
          <div className="min-w-0">
            <div className="text-sm text-[var(--muted)] truncate">{greeting}</div>
            <h1 className="font-display text-xl leading-tight">{t('appName')}</h1>
          </div>
          <button
            type="button"
            aria-label={t('notifications')}
            className="action-round tap ms-auto"
          >
            <Icon name="bell" size={20} />
          </button>
        </header>

        {!trip ? (
          <EmptyState isParent={isParent} t={t} />
        ) : (
          <TripHome trip={trip} members={members} t={t} />
        )}
      </div>
    </div>
  )
}

function EmptyState({ isParent, t }: { isParent: boolean; t: ReturnType<typeof useT> }) {
  return (
    <div className="space-y-4">
      <div className="state-card">
        <span className="state-visual">
          <Icon name="map" size={22} />
        </span>
        <div>
          <h4 className="font-hand text-lg">{t('noTrips')}</h4>
          <p className="text-sm text-[var(--muted)]">
            {isParent ? t('noTripsCta') : t('askParentTrip')}
          </p>
        </div>
      </div>
      {isParent && (
        <Link to="/trips/new" className="primary-btn tap w-full py-3 text-lg inline-flex items-center justify-center gap-2">
          <Icon name="plus" size={22} />
          {t('createFirstTrip')}
        </Link>
      )}
    </div>
  )
}

function TripHome({
  trip,
  members,
  t,
}: {
  trip: Trip
  members: Member[]
  t: ReturnType<typeof useT>
}) {
  const cover = coverPhoto(trip)
  const pct = checklistProgress(trip.checklist).pct
  const pulse = findPulse(trip)
  const byMember = (id?: string): Member | undefined => members.find((m) => m.id === id)
  // Next 2 day-stubs (skip nothing — just first two days as "up next").
  const upNext: Day[] = trip.days.slice(0, 2)

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <Link to={`/trips/${trip.id}`} className={`hero-card block ${cover ? 'has-photo' : ''}`}>
        {cover?.svg ? (
          <span dangerouslySetInnerHTML={{ __html: cover.svg }} />
        ) : cover?.src ? (
          <img src={cover.src} alt="" />
        ) : null}
        <div className="hero-tools">
          <span className="glass-pill">
            <Icon name="calendar" size={14} />
            <bdi>
              {trip.startDate} – {trip.endDate}
            </bdi>
          </span>
          <span className="glass-pill">{t.fn('daysCount')(dayCount(trip))}</span>
        </div>
        <div className="hero-copy">
          <h3 className="text-2xl font-display mb-0.5">{trip.name}</h3>
          <p className="text-sm opacity-90 mb-2">
            <bdi>{trip.destination}</bdi>
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="avatar-stack">
              {members.slice(0, 4).map((m) => (
                <Avatar key={m.id} figure={m.figure} color={m.color} size={26} />
              ))}
            </span>
            <span className="progress-pill">{t.fn('planningDone')(pct)}</span>
          </div>
        </div>
      </Link>

      {/* Quick grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-base">{t('quickAccess')}</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Link to={`/trips/${trip.id}`} className="quick tap block">
            <span className="quick-icon">
              <Icon name="calendar" size={20} />
            </span>
            <span className="text-[11px] font-semibold">{t('quickSchedule')}</span>
          </Link>
          <a
            href={mapsUrl(trip.destination)}
            target="_blank"
            rel="noopener"
            className="quick tap block"
          >
            <span className="quick-icon sea">
              <Icon name="map" size={20} />
            </span>
            <span className="text-[11px] font-semibold">{t('quickRoute')}</span>
          </a>
          <Link to="/album" className="quick tap block">
            <span className="quick-icon sun">
              <Icon name="album" size={20} />
            </span>
            <span className="text-[11px] font-semibold">{t('album')}</span>
          </Link>
          <Link to={`/trips/${trip.id}/checklist`} className="quick tap block">
            <span className="quick-icon lilac">
              <Icon name="checkSquare" size={20} />
            </span>
            <span className="text-[11px] font-semibold">{t('quickGear')}</span>
          </Link>
        </div>
      </div>

      {/* Up next */}
      {upNext.length > 0 && (
        <div>
          <h3 className="font-display text-base mb-2">{t('upNext')}</h3>
          <div className="space-y-2">
            {upNext.map((d) => (
              <Link
                key={d.id}
                to={`/trips/${trip.id}/day/${d.id}`}
                className="activity-row tap"
              >
                <span className="activity-thumb">
                  <Icon name={trip.transport === 'flight' ? 'plane' : 'car'} size={20} directional />
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold truncate">{d.title}</h4>
                  <p className="text-[11px] text-[var(--muted)]">
                    {d.entries.length} · {d.photos.length}
                  </p>
                </div>
                <span className="chip-time text-[11px] px-2 py-1">
                  <bdi>{d.date}</bdi>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Family pulse */}
      {pulse && (
        <div>
          <h3 className="font-display text-base mb-2">{t('familyPulse')}</h3>
          <Link to={`/trips/${trip.id}/day/${pulse.dayId}`} className="pulse-card block">
            <div className="flex items-center gap-2">
              {byMember(pulse.by) && (
                <Avatar
                  figure={byMember(pulse.by)!.figure}
                  color={byMember(pulse.by)!.color}
                  size={30}
                />
              )}
              <div className="min-w-0">
                <strong className="text-sm block truncate">
                  {pulse.caption} <span aria-hidden>{pulse.emoji}</span>
                </strong>
                <span className="text-[11px] text-[var(--muted)]">{byMember(pulse.by)?.name}</span>
              </div>
            </div>
            {totalReactsChips(pulse.reacts)}
          </Link>
        </div>
      )}
    </div>
  )
}

function totalReactsChips(reacts: Record<string, string[]>) {
  const entries = Object.entries(reacts).filter(([, l]) => l.length > 0)
  if (entries.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {entries.map(([emoji, list]) => (
        <span key={emoji} className="reaction-chip">
          <span aria-hidden>{emoji}</span>
          <span className="font-bold">{list.length}</span>
        </span>
      ))}
    </div>
  )
}
