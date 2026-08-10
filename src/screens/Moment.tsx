import { useRef, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { todayISO } from '../lib/tripSelect'
import { dayTabLabel } from '../lib/dayFormat'
import { readImageFile } from '../lib/readImageFile'
import { ALLOWED_EMOJIS } from '../lib/reactions'
import type { Member } from '../types'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { TripHeader } from '../components/TripHeader'

/**
 * The mood choices ARE the photo's reaction emojis (Galli feedback): whatever is
 * picked here becomes a real reaction on the saved photo, instead of a mood that
 * was recorded and then never shown anywhere.
 */
const MOODS = ALLOWED_EMOJIS

export function Moment() {
  const t = useT()
  const navigate = useNavigate()
  const { tripId } = useParams()
  const member = useCurrentMember()!
  const members = useStore((s) => s.members)
  const trip = useStore((s) => s.trips.find((x) => x.id === tripId))
  const addPhoto = useStore((s) => s.addPhoto)
  const showToast = useStore((s) => s.showToast)
  const activeDayId = useStore((s) => (tripId ? s.activeDay[tripId] : undefined))

  const tripMembers = (trip?.members ?? []).map((id) => members.find((m) => m.id === id)).filter(Boolean) as Member[]

  const fileRef = useRef<HTMLInputElement>(null)
  const [dataUrl, setDataUrl] = useState('')
  const [caption, setCaption] = useState('')
  // No preselected mood — an emoji now becomes a real reaction, so it must be a
  // deliberate choice. Tapping the selected one clears it.
  const [mood, setMood] = useState<string>('')
  const [people, setPeople] = useState<string[]>(trip?.members ?? [])
  const [dayId, setDayId] = useState<string>(() => {
    if (!trip || trip.days.length === 0) return ''
    // Default to the day you were just looking at in the planner (Item 1); then
    // fall back to today's date, and finally to the trip's last day.
    if (activeDayId && trip.days.some((d) => d.id === activeDayId)) return activeDayId
    const today = todayISO()
    return (trip.days.find((d) => d.date === today) ?? trip.days[trip.days.length - 1]).id
  })
  const [error, setError] = useState('')
  // Reading + downscaling a phone photo takes real time. Without this the
  // dropzone stayed empty and silent, so it looked like the tap did nothing.
  const [reading, setReading] = useState(false)

  if (!trip) return <Navigate to="/trips" replace />

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be chosen again later
    if (!file) return
    setError('')
    setReading(true)
    readImageFile(file)
      .then(setDataUrl)
      .catch(() => setError(t('photoRequired')))
      .finally(() => setReading(false))
  }

  function togglePerson(id: string) {
    setPeople((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!dayId) {
      setError(t('askParentTrip'))
      return
    }
    // A photo is ALWAYS required — the journal is gone, a moment IS a photo.
    if (!dataUrl) {
      setError(t('photoRequired'))
      return
    }
    try {
      const status = addPhoto(
        trip!.id,
        dayId,
        { src: dataUrl, caption: caption.trim(), by: member.id, mood: mood || undefined, people },
        member.role,
      )
      showToast(status === 'pending' ? t('sentForApproval') : t('momentSaved'))
      navigate(`/trips/${trip!.id}/album`)
    } catch {
      // Saving must never dead-end on a white screen — surface a toast instead.
      showToast(t('syncFailed'))
    }
  }

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <TripHeader trip={trip} subtitle={t('momentTitle')} />

        <form onSubmit={save} className="composer space-y-3">
          {/* Dropzone */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={reading}
            aria-busy={reading}
            className={`dropzone tap ${dataUrl && !reading ? 'has-photo' : ''}`}
            aria-label={t('addPhotoVideo')}
          >
            {reading ? (
              <>
                <span className="bubble">
                  <Icon name="album" size={22} />
                </span>
                <strong className="text-[var(--ink)] text-sm">{t('photoProcessing')}</strong>
              </>
            ) : dataUrl ? (
              <img src={dataUrl} alt={caption || t('addPhotoVideo')} />
            ) : (
              <>
                <span className="bubble">
                  <Icon name="album" size={22} />
                </span>
                <strong className="text-[var(--ink)] text-sm">{t('addPhotoVideo')}</strong>
                <span className="text-xs">{t('addPhotoHint')}</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

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
                  onClick={() => setMood((cur) => (cur === m ? '' : m))}
                  className={`emoji-btn tap ${mood === m ? 'selected' : ''}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* People — THIS trip's members only */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">{t('peopleQ')}</label>
            <div className="flex flex-wrap gap-2">
              {/* Every member of THIS trip, each with their NAME — an avatar
                  alone was not enough to tell people apart (Galli feedback). */}
              {tripMembers.map((m) => {
                const on = people.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => togglePerson(m.id)}
                    aria-pressed={on}
                    className={`tap inline-flex items-center gap-2 rounded-[14px] border ps-2 pe-3 py-1.5 ${
                      on
                        ? 'border-[var(--coral)] bg-[var(--coral-soft)]'
                        : 'border-[var(--line)] bg-white opacity-60'
                    }`}
                  >
                    <Avatar figure={m.figure} color={m.color} size={32} />
                    <span className="text-sm font-bold text-[var(--ink)]">{m.name}</span>
                    {on && <Icon name="check" size={15} className="text-[var(--coral)]" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Assign to day — THIS trip only */}
          <div>
            <label htmlFor="mo-day" className="block text-xs font-semibold mb-1.5">
              {t('assignDay')}
            </label>
            <select
              id="mo-day"
              value={dayId}
              onChange={(e) => setDayId(e.target.value)}
              className="tap w-full bg-white rounded-[14px] px-3 py-2.5 border border-[var(--line)] outline-none"
            >
              {trip.days.map((d) => (
                <option key={d.id} value={d.id}>
                  {dayTabLabel(d.date)} · {d.title || t('dayNamePlaceholder')}
                </option>
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
      </div>
    </div>
  )
}
