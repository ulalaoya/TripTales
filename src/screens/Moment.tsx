import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { can } from '../lib/permissions'
import { primaryTrip, todayISO } from '../lib/tripSelect'
import type { Trip } from '../types'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { Logo } from '../components/Logo'
import { LangToggle } from '../components/LangToggle'

const MOODS = ['🤩', '😍', '😂', '😋', '😴', '😱']

/** Default "trip|day" target: today's day of the active trip, else its last day. */
function defaultTarget(trips: Trip[], today: string): string {
  const trip = primaryTrip(trips, today)
  if (!trip || trip.days.length === 0) return ''
  const todayDay = trip.days.find((d) => d.date === today)
  const day = todayDay ?? trip.days[trip.days.length - 1]
  return `${trip.id}|${day.id}`
}

export function Moment() {
  const t = useT()
  const navigate = useNavigate()
  const member = useCurrentMember()!
  const members = useStore((s) => s.members)
  const trips = useStore((s) => s.trips)
  const addPhoto = useStore((s) => s.addPhoto)
  const addEntry = useStore((s) => s.addEntry)
  const showToast = useStore((s) => s.showToast)

  const isParent = member.role === 'מבוגר'
  const canJournal = can(member.role, 'entry.create') // parent-only

  const fileRef = useRef<HTMLInputElement>(null)
  const [dataUrl, setDataUrl] = useState<string>('')
  const [caption, setCaption] = useState('')
  const [mood, setMood] = useState(MOODS[0])
  const [people, setPeople] = useState<string[]>(members.map((m) => m.id))
  const [target, setTarget] = useState<string>(() => defaultTarget(trips, todayISO()))
  const [error, setError] = useState('')

  const hasTrips = trips.some((tr) => tr.days.length > 0)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setDataUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  function togglePerson(id: string) {
    setPeople((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const [tripId, dayId] = target.split('|')
    if (!tripId || !dayId) {
      setError(t('askParentTrip'))
      return
    }
    if (dataUrl) {
      const status = addPhoto(
        tripId,
        dayId,
        { src: dataUrl, caption: caption.trim(), by: member.id, mood, people },
        member.role,
      )
      showToast(status === 'pending' ? t('sentForApproval') : t('momentSaved'))
      navigate(`/trips/${tripId}/day/${dayId}`)
      return
    }
    // No photo → journal entry (parents only).
    if (!canJournal) {
      setError(t('photoRequired'))
      return
    }
    if (!caption.trim()) {
      setError(t('photoRequired'))
      return
    }
    addEntry(tripId, dayId, { text: caption.trim(), mood, author: member.id, people })
    showToast(t('momentSaved'))
    navigate(`/trips/${tripId}/day/${dayId}`)
  }

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <header className="flex justify-between items-center mb-5">
          <Logo variant="emboss" size="sm" />
          <LangToggle />
        </header>

        <h1 className="font-display text-2xl mb-4">{t('momentTitle')}</h1>

        {!hasTrips ? (
          <div className="state-card">
            <span className="state-visual">
              <Icon name="camera" size={22} />
            </span>
            <div>
              <h4 className="font-hand text-lg">{t('noTrips')}</h4>
              <p className="text-sm text-[var(--muted)]">
                {isParent ? t('noTripsCta') : t('askParentTrip')}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={save} className="composer space-y-3">
            {/* Dropzone */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="dropzone tap"
              aria-label={t('addPhotoVideo')}
            >
              {dataUrl ? (
                <img src={dataUrl} alt={caption || t('addPhotoVideo')} />
              ) : (
                <>
                  <span className="bubble">
                    <Icon name="camera" size={22} />
                  </span>
                  <strong className="text-[var(--ink)] text-sm">{t('addPhotoVideo')}</strong>
                  <span className="text-xs">{t('addPhotoHint')}</span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onFile}
              className="hidden"
            />
            {/* No-photo hint — parents only (children must attach a photo). */}
            {canJournal && !dataUrl && (
              <p className="text-xs text-[var(--muted)] text-center">{t('noPhotoOption')}</p>
            )}

            {/* Caption */}
            <div>
              <label htmlFor="mo-cap" className="block text-xs font-semibold mb-1.5">
                {t('momentCaptionQ')}
              </label>
              <textarea
                id="mo-cap"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder={t('momentCaptionPh')}
                className="w-full bg-white rounded-[14px] px-3 py-2.5 border border-[var(--line)] outline-none resize-none"
              />
            </div>

            {/* Mood */}
            <div>
              <label className="block text-xs font-semibold mb-1.5">{t('moodQ')}</label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('moodQ')}>
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mood === m}
                    onClick={() => setMood(m)}
                    className={`emoji-btn tap ${mood === m ? 'selected' : ''}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* People */}
            <div>
              <label className="block text-xs font-semibold mb-1.5">{t('peopleQ')}</label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const on = people.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => togglePerson(m.id)}
                      aria-pressed={on}
                      aria-label={m.name}
                      className="tap rounded-[14px]"
                      style={{ opacity: on ? 1 : 0.4, boxShadow: on ? '0 0 0 3px var(--sea-soft)' : 'none' }}
                    >
                      <Avatar figure={m.figure} color={m.color} size={40} />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Assign to day */}
            <div>
              <label htmlFor="mo-day" className="block text-xs font-semibold mb-1.5">
                {t('assignDay')}
              </label>
              <select
                id="mo-day"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="tap w-full bg-white rounded-[14px] px-3 py-2.5 border border-[var(--line)] outline-none"
              >
                {trips
                  .filter((tr) => tr.days.length > 0)
                  .map((tr) => (
                    <optgroup key={tr.id} label={tr.name}>
                      {tr.days.map((d) => (
                        <option key={d.id} value={`${tr.id}|${d.id}`}>
                          {d.title} · {d.date}
                        </option>
                      ))}
                    </optgroup>
                  ))}
              </select>
            </div>

            {error && (
              <p role="alert" aria-live="assertive" className="text-sm text-[var(--danger)]">
                {error}
              </p>
            )}

            <button type="submit" className="primary-btn tap w-full py-3 text-lg">
              {t('saveMoment')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
