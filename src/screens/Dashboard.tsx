import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { can } from '../lib/permissions'
import { buildInviteText } from '../lib/invite'
import { checklistProgress } from '../lib/checklist'
import { coverPhotoOf } from '../lib/tripCover'
import { tripStatus, statusLabel, statusTag, type TripStatus } from '../lib/tripStatus'
import { todayISO } from '../lib/tripSelect'
import { isValidJoinCodeFormat } from '../lib/joinCode'
import type { Trip, Member } from '../types'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { LangToggle } from '../components/LangToggle'
import { Avatar } from '../components/Avatar'
import { SyncBadge } from '../components/SyncBadge'
import { isCloudEnabled } from '../lib/firebase'
import { cloudJoinByCode } from '../lib/cloud'

type Tab = 'all' | 'planned' | 'ended' | 'idea'

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
  const joinTripByCode = useStore((s) => s.joinTripByCode)
  const showToast = useStore((s) => s.showToast)
  const [editMode, setEditMode] = useState(false)
  const [tab, setTab] = useState<Tab>('all')
  const [joinOpen, setJoinOpen] = useState(false)
  const [code, setCode] = useState('')
  const [joinErr, setJoinErr] = useState('')

  const today = todayISO()
  const isParent = member.role === 'מבוגר'
  const byId = (id: string): Member | undefined => members.find((m) => m.id === id)
  const sorted = [...trips].sort((a, b) => a.order - b.order)
  const visible = sorted.filter((tr) => matchesTab(tripStatus(tr, today), tab))

  const TABS: { id: Tab; label: string }[] = [
    { id: 'all', label: t('tabAll') },
    { id: 'planned', label: statusLabel('planned', t.lang) },
    { id: 'ended', label: statusLabel('ended', t.lang) },
    { id: 'idea', label: statusLabel('idea', t.lang) },
  ]

  async function share(trip: Trip) {
    const text = buildInviteText(trip, t.lang, trip.joinCode)
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

  function joined(tripId: string) {
    showToast(t('joinedTrip'))
    setJoinOpen(false)
    setCode('')
    navigate(`/trips/${tripId}`)
  }

  async function submitJoin(e: React.FormEvent) {
    e.preventDefault()
    setJoinErr('')
    if (!isValidJoinCodeFormat(code)) {
      setJoinErr(t('joinInvalidFormat'))
      return
    }
    // Cloud mode: ALWAYS resolve the code against the cloud first. A fresh
    // install seeds `t-drive`/`SUNSET` locally, so the local `joinTripByCode`
    // would happily "join" that seed copy and short-circuit before the real
    // cloud arrayUnion ever runs — leaving the joiner on their own copy instead
    // of the sharer's trip. Going cloud-first guarantees my uid lands in the
    // cloud trip's `memberUids` even when a same-id local trip already exists.
    if (isCloudEnabled) {
      const remote = await cloudJoinByCode(code)
      if (remote.ok) {
        joined(remote.tripId)
        return
      }
      if (remote.reason === 'already') {
        // Already a member of the cloud trip — friendly, not an error.
        showToast(t('joinAlready'))
        setJoinOpen(false)
        setCode('')
        navigate(`/trips/${remote.tripId}`)
        return
      }
      if (remote.reason === 'notfound') {
        setJoinErr(t('joinNotFound'))
        return
      }
      // remote.reason === 'offline' → cloud unusable; fall through to the
      // local-only path, which also covers trips this device already holds.
    }
    // Local-only path (and cloud-offline fallback) — unchanged behaviour.
    const res = joinTripByCode(code)
    if (res.ok) {
      joined(res.tripId)
      return
    }
    setJoinErr(res.reason === 'already' ? t('joinAlready') : t('joinNotFound'))
  }

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <header className="flex justify-between items-center mb-5">
          <Logo variant="emboss" size="sm" />
          <div className="flex items-center gap-2">
            <SyncBadge />
            <LangToggle />
            <button
              type="button"
              onClick={() => navigate('/profile/edit')}
              aria-label={t('profile')}
              className="tap"
            >
              <Avatar figure={member.figure} color={member.color} size={40} />
            </button>
          </div>
        </header>

        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-2xl">{t.fn('allTripsOf')(member.name.split(' ')[0] || member.name)}</h1>
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
            const cover = coverPhotoOf(trip)
            const tripMembers = trip.members.map(byId).filter(Boolean) as Member[]
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
                      </bdi>
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="avatar-stack">
                        {tripMembers.slice(0, 4).map((m) => (
                          <Avatar key={m.id} figure={m.figure} color={m.color} size={24} />
                        ))}
                      </span>
                      <span className="tag text-[10px] px-2 py-1">{statusTag(status, t.lang)}</span>
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

        {/* Primary CTA — plan a new trip (adults only) */}
        {can(member.role, 'trip.create') && (
          <button
            type="button"
            onClick={() => navigate('/trips/new')}
            className="primary-btn tap w-full py-3 text-lg mt-4 inline-flex items-center justify-center gap-2"
          >
            <Icon name="plus" size={20} />
            {t('planTrip')}
          </button>
        )}

        {/* Secondary — join with a code */}
        <div className="mt-3">
          {joinOpen ? (
            <form onSubmit={submitJoin} className="journal-lined p-4 space-y-3">
              <label htmlFor="join-code" className="block text-sm font-medium">
                {t('enterCode')}
              </label>
              <input
                id="join-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                dir="ltr"
                autoFocus
                maxLength={12}
                className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none text-center tracking-[0.3em] uppercase font-mono"
                aria-invalid={!!joinErr}
                aria-describedby="join-err"
              />
              <div id="join-err" aria-live="assertive" className="min-h-[1.1rem] text-sm text-[var(--danger)]">
                {joinErr}
              </div>
              <div className="flex gap-2">
                <button type="submit" className="primary-btn tap px-4 text-sm">
                  {t('join')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setJoinOpen(false)
                    setJoinErr('')
                  }}
                  className="tap px-4 rounded-[14px] border border-[var(--line)] bg-white text-sm"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setJoinOpen(true)} className="add-card tap">
              <Icon name="users" size={18} />
              {t('joinWithCode')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
