import { useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { can } from '../lib/permissions'
import { mapsUrl } from '../lib/maps'
import type { Entry, Photo, Member } from '../types'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { ReactionBar } from '../components/ReactionBar'

const MOODS = ['😍', '😄', '🌊', '🏔️', '🍦', '🚗', '✈️', '⭐']
const PHOTO_HUES = ['#4a86b8', '#c98a5a', '#6b8f3a', '#8a6a3a', '#2f7d8c', '#9a5a7a']

function photoSvg(hue: string, label: string): string {
  const safe = label.replace(/[<>&]/g, '')
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'>
    <rect width='200' height='150' fill='${hue}'/>
    <circle cx='150' cy='40' r='20' fill='rgba(255,255,255,.6)'/>
    <path d='M0 120 L60 80 L110 110 L160 70 L200 100 L200 150 L0 150 Z' fill='rgba(0,0,0,.18)'/>
    <text x='12' y='140' font-family='Courier New' font-size='13' fill='rgba(255,255,255,.85)'>${safe}</text>
  </svg>`
}

export function DayView() {
  const t = useT()
  const navigate = useNavigate()
  const { tripId, dayId } = useParams()
  const member = useCurrentMember()!
  const members = useStore((s) => s.members)
  const trip = useStore((s) => s.trips.find((x) => x.id === tripId))
  const day = trip?.days.find((d) => d.id === dayId)

  const addEntry = useStore((s) => s.addEntry)
  const deleteEntry = useStore((s) => s.deleteEntry)
  const addPhoto = useStore((s) => s.addPhoto)
  const approvePhoto = useStore((s) => s.approvePhoto)
  const rejectPhoto = useStore((s) => s.rejectPhoto)
  const toggleFav = useStore((s) => s.toggleFav)
  const reactEntry = useStore((s) => s.reactEntry)
  const reactPhoto = useStore((s) => s.reactPhoto)
  const showToast = useStore((s) => s.showToast)

  const [text, setText] = useState('')
  const [mood, setMood] = useState(MOODS[0])
  const [loc, setLoc] = useState('')
  const [caption, setCaption] = useState('')

  if (!trip || !day) return <Navigate to="/trips" replace />

  const isParent = member.role === 'מבוגר'
  const findMember = (id: string): Member | undefined => members.find((m) => m.id === id)

  // Visible photos per role.
  const visiblePhotos = day.photos.filter((p) => {
    if (p.status === 'approved') return true
    // pending:
    return isParent || p.by === member.id
  })

  function submitEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    addEntry(trip!.id, day!.id, { text: text.trim(), mood, loc: loc.trim() || undefined, author: member.id })
    setText('')
    setLoc('')
  }

  function submitPhoto(e: React.FormEvent) {
    e.preventDefault()
    const hue = PHOTO_HUES[day!.photos.length % PHOTO_HUES.length]
    const status = addPhoto(
      trip!.id,
      day!.id,
      { svg: photoSvg(hue, caption.trim() || 'TripTales'), caption: caption.trim(), by: member.id },
      member.role,
    )
    setCaption('')
    if (status === 'pending') showToast(t('sentForApproval'))
  }

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <button
          type="button"
          onClick={() => navigate(`/trips/${trip.id}`)}
          className="tap inline-flex items-center gap-1 text-[var(--ink)] mb-4"
        >
          <Icon name="chevron" size={18} className="dir-back" />
          {t('back')}
        </button>

        <h1 className="font-hand text-2xl">{day.title}</h1>
        <div className="text-xs text-[var(--muted)] mb-5">
          <bdi>{day.date}</bdi>
        </div>

        {/* ===== Journal ===== */}
        <section className="mb-8">
          <h2 className="font-display text-lg text-[var(--ink)] mb-2">{t('journal')}</h2>

          {day.entries.length === 0 && <p className="text-sm text-[var(--muted)] mb-3">—</p>}

          <ul className="space-y-3">
            {day.entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                author={findMember(entry.author)}
                canDelete={can(member.role, 'entry.delete')}
                onDelete={() => deleteEntry(trip.id, day.id, entry.id)}
                onReact={(emoji) => reactEntry(trip.id, day.id, entry.id, emoji, member.id)}
                memberId={member.id}
              />
            ))}
          </ul>

          {/* Add entry — parents only */}
          {can(member.role, 'entry.create') && (
            <form onSubmit={submitEntry} className="journal-lined mt-4 p-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('entryPlaceholder')}
                rows={2}
                className="w-full bg-transparent font-hand text-lg outline-none resize-none"
              />
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t('moodLabel')}>
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(m)}
                      aria-checked={mood === m}
                      role="radio"
                      className={`tap rounded-full text-lg ${mood === m ? 'bg-[var(--coral-soft)]' : ''}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
                  placeholder={t('locLabel')}
                  className="tap flex-1 min-w-[8rem] bg-white rounded-[14px] px-3 py-2 text-sm border border-[var(--line)] outline-none"
                />
                <button type="submit" className="primary-btn tap px-4 text-sm">
                  {t('addEntry')}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ===== Photos ===== */}
        <section>
          <h2 className="font-display text-lg text-[var(--ink)] mb-3">{t('album')}</h2>

          {visiblePhotos.length === 0 && <p className="text-sm text-[var(--muted)] mb-3">{t('noPhotos')}</p>}

          <div className="grid grid-cols-2 gap-4">
            {visiblePhotos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                author={findMember(photo.by)}
                isParent={isParent}
                memberId={member.id}
                t={t}
                onApprove={() => approvePhoto(trip.id, day.id, photo.id)}
                onReject={() => rejectPhoto(trip.id, day.id, photo.id)}
                onFav={() => toggleFav(trip.id, day.id, photo.id)}
                onReact={(emoji) => reactPhoto(trip.id, day.id, photo.id, emoji, member.id)}
              />
            ))}
          </div>

          {/* Add photo — both roles */}
          {can(member.role, 'photo.upload') && (
            <form onSubmit={submitPhoto} className="flex items-center gap-2 mt-4">
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t('photoCaption')}
                className="tap flex-1 bg-white rounded-[14px] px-3 py-2 text-sm border border-[var(--line)] outline-none"
              />
              <button type="submit" className="primary-btn tap inline-flex items-center gap-1 px-4 text-sm">
                <Icon name="camera" size={18} />
                {t('addPhoto')}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}

function EntryCard({
  entry,
  author,
  canDelete,
  onDelete,
  onReact,
  memberId,
}: {
  entry: Entry
  author?: Member
  canDelete: boolean
  onDelete: () => void
  onReact: (emoji: string) => void
  memberId: string
}) {
  const t = useT()
  return (
    <li className="journal-lined p-4">
      <div className="flex items-start gap-2">
        {author && <Avatar figure={author.figure} color={author.color} size={36} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm">{author?.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                {entry.mood}
              </span>
              {canDelete && (
                <button type="button" onClick={onDelete} aria-label={t('delete')} className="tap p-1 text-[var(--danger)]">
                  <Icon name="trash" size={16} />
                </button>
              )}
            </div>
          </div>
          <p className="font-hand text-lg leading-snug mt-1">{entry.text}</p>
          {entry.loc && (
            <a
              href={mapsUrl(entry.loc)}
              target="_blank"
              rel="noopener"
              className="tap-chip gap-1 mt-1 text-xs text-[var(--coral)] font-semibold"
            >
              <Icon name="mapPin" size={14} />
              <bdi>{entry.loc}</bdi>
            </a>
          )}
          <ReactionBar reacts={entry.reacts} memberId={memberId} onToggle={onReact} />
        </div>
      </div>
    </li>
  )
}

function PhotoCard({
  photo,
  author,
  isParent,
  memberId,
  t,
  onApprove,
  onReject,
  onFav,
  onReact,
}: {
  photo: Photo
  author?: Member
  isParent: boolean
  memberId: string
  t: ReturnType<typeof useT>
  onApprove: () => void
  onReject: () => void
  onFav: () => void
  onReact: (emoji: string) => void
}) {
  const isPending = photo.status === 'pending'
  const dimmed = isPending && !isParent // child's own pending → reduced opacity, no tint
  return (
    <div className="relative">
      <div className="gallery-tile" style={dimmed ? { opacity: 0.65 } : undefined}>
        {/* pending overlay pill */}
        {isPending && (
          <div className="pending-pill absolute top-2 inset-inline-start-2 text-[10px] z-10 px-2 py-0.5">
            {t('pending')}
          </div>
        )}
        {photo.svg ? (
          <span dangerouslySetInnerHTML={{ __html: photo.svg }} />
        ) : (
          <img src={photo.src} alt={photo.caption} />
        )}
        <div className="tile-caption font-hand text-sm truncate">{photo.caption}</div>
      </div>

      {/* approved: favourite + reactions */}
      {photo.status === 'approved' && (
        <div className="mt-1">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onFav}
              aria-pressed={photo.fav}
              aria-label={t('favourite')}
              className="tap p-1 text-[var(--coral)]"
            >
              <Icon name={photo.fav ? 'heartFilled' : 'heart'} size={20} />
            </button>
            {author && <span className="text-[10px] text-[var(--muted)]">{author.name}</span>}
          </div>
          <ReactionBar reacts={photo.reacts} memberId={memberId} onToggle={onReact} />
        </div>
      )}

      {/* pending + parent: approve / reject */}
      {isPending && isParent && (
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={onApprove}
            className="tap flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-full bg-white border border-[var(--line)] text-[var(--success)] text-sm font-semibold"
          >
            <Icon name="check" size={16} />
            {t('approve')}
          </button>
          <button
            type="button"
            onClick={onReject}
            className="tap flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-full bg-white border border-[var(--line)] text-[var(--danger)] text-sm font-semibold"
          >
            <Icon name="close" size={16} />
            {t('reject')}
          </button>
        </div>
      )}
    </div>
  )
}
