import { useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import type { Transport, Day } from '../types'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { can } from '../lib/permissions'
import { Icon } from '../components/Icon'

function buildDays(start: string, end: string, existing: Day[]): Day[] {
  const s = new Date(start)
  const e = new Date(end)
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return existing
  const days: Day[] = []
  let i = 0
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1), i++) {
    const iso = d.toISOString().slice(0, 10)
    const prev = existing.find((x) => x.date === iso)
    days.push(prev ?? { id: `d-${iso}-${i}`, date: iso, title: `יום ${i + 1}`, entries: [], photos: [] })
  }
  return days
}

export function TripForm() {
  const t = useT()
  const navigate = useNavigate()
  const member = useCurrentMember()!
  const { tripId } = useParams()
  const trips = useStore((s) => s.trips)
  const addTrip = useStore((s) => s.addTrip)
  const updateTrip = useStore((s) => s.updateTrip)

  const existing = tripId ? trips.find((x) => x.id === tripId) : undefined
  const [name, setName] = useState(existing?.name ?? '')
  const [destination, setDestination] = useState(existing?.destination ?? '')
  const [startDate, setStartDate] = useState(existing?.startDate ?? '')
  const [endDate, setEndDate] = useState(existing?.endDate ?? '')
  const [transport, setTransport] = useState<Transport>(existing?.transport ?? 'flight')
  const [idea, setIdea] = useState<boolean>(existing?.idea ?? false)

  // Route guard — children may not create/edit trips.
  if (!can(member.role, existing ? 'trip.edit' : 'trip.create')) return <Navigate to="/trips" replace />
  if (tripId && !existing) return <Navigate to="/trips" replace />

  function save(e: React.FormEvent) {
    e.preventDefault()
    const days = buildDays(startDate, endDate, existing?.days ?? [])
    if (existing) {
      updateTrip(existing.id, { name, destination, startDate, endDate, transport, idea, days })
      navigate(`/trips/${existing.id}`)
    } else {
      const trip = addTrip({ name, destination, startDate, endDate, transport, idea, days })
      navigate(`/trips/${trip.id}`)
    }
  }

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="tap inline-flex items-center gap-1 text-[var(--ink-fountain)] mb-4"
        >
          <Icon name="chevron" size={18} className="dir-back" />
          {t('back')}
        </button>

        <h1 className="font-display text-2xl mb-4 text-[var(--ink-fountain)]">
          {existing ? t('edit') : t('addTrip')}
        </h1>

        <form onSubmit={save} className="space-y-4">
          <Field label={t('tripName')}>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
            />
          </Field>

          <Field label={t('destination')}>
            <input
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('startDate')}>
              <input
                required
                type="date"
                dir="ltr"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
              />
            </Field>
            <Field label={t('endDate')}>
              <input
                required
                type="date"
                dir="ltr"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
              />
            </Field>
          </div>

          {/* Transport segmented toggle */}
          <Field label={t('transport')}>
            <div className="inline-flex rounded-[14px] overflow-hidden border border-[var(--line)] bg-white" role="radiogroup">
              {(['flight', 'drive'] as Transport[]).map((tr) => (
                <button
                  key={tr}
                  type="button"
                  role="radio"
                  aria-checked={transport === tr}
                  onClick={() => setTransport(tr)}
                  className={`tap inline-flex items-center gap-1 px-4 py-2 text-sm font-medium ${
                    transport === tr ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink)]'
                  }`}
                >
                  <Icon name={tr === 'flight' ? 'plane' : 'car'} size={18} directional />
                  {tr === 'flight' ? t('flight') : t('drive')}
                </button>
              ))}
            </div>
          </Field>

          {/* Idea-only toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={idea}
              onClick={() => setIdea((v) => !v)}
              className={`tap relative w-12 h-7 rounded-full transition ${
                idea ? 'bg-[var(--coral)]' : 'bg-[var(--line)]'
              }`}
            >
              <span
                className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
                style={{ insetInlineStart: idea ? '1.5rem' : '0.25rem' }}
              />
            </button>
            <span className="text-sm font-medium">{t('ideaOnly')}</span>
          </label>

          <button type="submit" className="primary-btn tap w-full py-3 text-lg">
            {t('save')}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  )
}
