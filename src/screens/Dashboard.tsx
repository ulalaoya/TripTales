import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { can } from '../lib/permissions'
import { buildInviteText } from '../lib/invite'
import { checklistProgress } from '../lib/checklist'
import { tripStatus, statusLabel, statusTag, type TripStatus } from '../lib/tripStatus'
import { todayISO } from '../lib/tripSelect'
import type { Trip, Photo } from '../types'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { LangToggle } from '../components/LangToggle'

type Tab = 'all' | 'planned' | 'ended' | 'idea'

function coverPhoto(trip: Trip): Photo | undefined {
  for (const d of trip.days) {
    const p = d.photos.find((x) => x.status === 'approved')
    if (p) return p
  }
  return undefined
}

function matchesTab(status: TripStatus, tab: Tab): boolean {
  if (tab === 'all') return true
  if (tab === 'planned') return status === 'planned' || status === 'active'
  if (tab === 'ended') return status === 'ended'
  return status === 'idea'
}

export function Dashboard() {
  const t = useT()
  const navigate = useNavigate()
  const member = useCurrentMember()!
  const trips = useStore((s) => s.trips)
  const members = useStore((s) => s.members)
  const deleteTrip = useStore((s) => s.deleteTrip)
  const reorderTrip = useStore((s) => s.reorderTrip)
  const showToast = useStore((s) => s.showToast)
  const [editMode, setEditMode] = useState(false)
  const [tab, setTab] = useState<Tab>('all')

  const today = todayISO()
  const isParent = member.role === 'מבוגר'
  const sorted = [...trips].sort((a, b) => a.order - b.order)
  const visible = sorted.filter((tr) => matchesTab(tripStatus(tr, today), tab))

  const TABS: { id: Tab; label: string }[] = [
    { id: 'all', label: t('tabAll') },
    { id: 'planned', label: statusLabel('planned', t.lang) },
    { id: 'ended', label: statusLabel('ended', t.lang) },
    { id: 'idea', label: statusLabel('idea', t.lang) },
  ]

  async function share(trip: Trip) {
    const text = buildInviteText(trip, t.lang)
    try {
      if (navigator.share) {
        await navigator.share({ title: trip.name, text })
        return
      }
    } catch {
      /* cancelled */
    }
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
    showToast(t('copied'))
  }

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <header className="flex justify-between items-center mb-5">
          <Logo variant="emboss" size="sm" />
          <LangToggle />
        </header>

        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-2xl">{t('allTrips')}</h1>
          {can(member.role, 'trip.edit') && (
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              className="tap px-3 py-1.5 rounded-full text-sm border border-[var(--line)] bg-white text-[var(--ink)]"
            >
              {editMode ? t('done') : t('edit')}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs mb-4" role="tablist" aria-label={t('allTrips')}>
          {TABS.map((tb) => (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={tab === tb.id}
              onClick={() => setTab(tb.id)}
              className={`tab tap ${tab === tb.id ? 'active' : ''}`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {visible.length === 0 && <p className="text-[var(--muted)]">{t('noTrips')}</p>}

        <ul className="space-y-3">
          {visible.map((trip, i) => {
            const status = tripStatus(trip, today)
            const pct = checklistProgress(trip.checklist).pct
            const cover = coverPhoto(trip)
            return (
              <li key={trip.id} className="trip-card p-2.5">
                <Link
                  to={`/trips/${trip.id}`}
                  className="grid gap-3"
                  style={{ gridTemplateColumns: '105px 1fr' }}
                >
                  <span className="trip-cover">
                    {cover?.svg ? (
                      <span dangerouslySetInnerHTML={{ __html: cover.svg }} />
                    ) : cover?.src ? (
                      <img src={cover.src} alt="" />
                    ) : null}
                  </span>
                  <div className="min-w-0 py-1">
                    <div className="flex items-center gap-1.5">
                      <Icon
                        name={trip.transport === 'flight' ? 'plane' : 'car'}
                        size={18}
                        directional
                        className="text-[var(--coral)] shrink-0"
                      />
                      <h3 className="font-hand text-lg truncate">{trip.name}</h3>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      <bdi>
                        {trip.startDate} – {trip.endDate}
                      </bdi>{' '}
                      · {t.fn('participantsCount')(members.length)}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="tag text-[10px] px-2 py-1">{statusTag(status, t.lang)}</span>
                      <span className="tag text-[10px] px-2 py-1">
                        {t.fn('daysCount')(trip.days.length)}
                      </span>
                      <span className="tag text-[10px] px-2 py-1">{pct}%</span>
                    </div>
                  </div>
                </Link>

                {/* Row actions */}
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => share(trip)}
                    aria-label={t('share')}
                    className="tap p-2 text-[var(--ink)]"
                  >
                    <Icon name="share" size={18} />
                  </button>
                  {isParent && editMode && (
                    <>
                      <button
                        type="button"
                        onClick={() => reorderTrip(trip.id, -1)}
                        disabled={i === 0}
                        aria-label="up"
                        className="tap p-2 disabled:opacity-30"
                      >
                        <Icon name="chevron" size={18} style={{ transform: 'rotate(-90deg)' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => reorderTrip(trip.id, 1)}
                        disabled={i === visible.length - 1}
                        aria-label="down"
                        className="tap p-2 disabled:opacity-30"
                      >
                        <Icon name="chevron" size={18} style={{ transform: 'rotate(90deg)' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/trips/${trip.id}/edit`)}
                        aria-label={t('edit')}
                        className="tap p-2 text-[var(--ink)]"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTrip(trip.id)}
                        aria-label={t('delete')}
                        className="tap p-2 text-[var(--danger)] ms-auto"
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {/* Parent-only create card */}
        {can(member.role, 'trip.create') && (
          <button
            type="button"
            onClick={() => navigate('/trips/new')}
            className="add-card tap mt-3"
          >
            <Icon name="plus" size={18} />
            {t('createTrip')}
          </button>
        )}
      </div>
    </div>
  )
}
