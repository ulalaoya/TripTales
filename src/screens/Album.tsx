import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { canApprovePhotos } from '../lib/tripPermissions'
import type { Photo, Day, Member } from '../types'
import { Icon } from '../components/Icon'
import { ReactionBar } from '../components/ReactionBar'

type Tab = 'all' | 'day' | 'fav'

export function Album() {
  const t = useT()
  const { tripId } = useParams()
  const member = useCurrentMember()!
  const members = useStore((s) => s.members)
  const trip = useStore((s) => s.trips.find((x) => x.id === tripId))
  const [tab, setTab] = useState<Tab>('all')

  if (!trip) return <Navigate to="/trips" replace />
  const isParent = canApprovePhotos(trip, member)
  const findMember = (id: string): Member | undefined => members.find((m) => m.id === id)

  const visible = (p: Photo) => p.status === 'approved' || isParent || p.by === member.id

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <h1 className="font-display text-2xl mb-1">{t('album')}</h1>
        <p className="text-sm text-[var(--muted)] mb-4">
          <bdi>{trip.name}</bdi>
        </p>

        <div className="tabs mb-4" role="tablist" aria-label={t('album')}>
          {([
            { id: 'all', label: t('tabAll') },
            { id: 'day', label: t('filterByDay') },
            { id: 'fav', label: t('favourites') },
          ] as { id: Tab; label: string }[]).map((tb) => (
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

        {tab === 'day' ? (
          <div className="space-y-6">
            {trip.days.map((d) => {
              const photos = d.photos.filter(visible)
              if (photos.length === 0) return null
              return (
                <section key={d.id}>
                  <h2 className="font-display text-base mb-2">
                    {d.title} <span className="text-xs text-[var(--muted)]"><bdi>{d.date}</bdi></span>
                  </h2>
                  <PhotoGrid photos={photos} trip={trip} isParent={isParent} member={member} findMember={findMember} t={t} />
                </section>
              )
            })}
            {trip.days.every((d) => d.photos.filter(visible).length === 0) && (
              <p className="text-sm text-[var(--muted)]">{t('noPhotos')}</p>
            )}
          </div>
        ) : (
          (() => {
            let all: { photo: Photo; dayId: string }[] = []
            for (const d of trip.days) for (const p of d.photos) if (visible(p)) all.push({ photo: p, dayId: d.id })
            if (tab === 'fav') all = all.filter((x) => x.photo.fav)
            if (all.length === 0)
              return <p className="text-sm text-[var(--muted)]">{tab === 'fav' ? t('noFavourites') : t('noPhotos')}</p>
            return (
              <div className="grid grid-cols-2 gap-4">
                {all.map(({ photo, dayId }) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    dayId={dayId}
                    trip={trip}
                    isParent={isParent}
                    member={member}
                    author={findMember(photo.by)}
                    t={t}
                  />
                ))}
              </div>
            )
          })()
        )}
      </div>
    </div>
  )
}

function PhotoGrid({
  photos,
  trip,
  isParent,
  member,
  findMember,
  t,
}: {
  photos: Photo[]
  trip: { id: string; days: Day[] }
  isParent: boolean
  member: Member
  findMember: (id: string) => Member | undefined
  t: ReturnType<typeof useT>
}) {
  const dayOf = (p: Photo) => trip.days.find((d) => d.photos.some((x) => x.id === p.id))!.id
  return (
    <div className="grid grid-cols-2 gap-4">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          dayId={dayOf(photo)}
          trip={trip}
          isParent={isParent}
          member={member}
          author={findMember(photo.by)}
          t={t}
        />
      ))}
    </div>
  )
}

function PhotoCard({
  photo,
  dayId,
  trip,
  isParent,
  member,
  author,
  t,
}: {
  photo: Photo
  dayId: string
  trip: { id: string }
  isParent: boolean
  member: Member
  author?: Member
  t: ReturnType<typeof useT>
}) {
  const approvePhoto = useStore((s) => s.approvePhoto)
  const rejectPhoto = useStore((s) => s.rejectPhoto)
  const toggleFav = useStore((s) => s.toggleFav)
  const reactPhoto = useStore((s) => s.reactPhoto)

  const isPending = photo.status === 'pending'
  const dimmed = isPending && !isParent
  return (
    <div className="relative">
      <div className="gallery-tile" style={dimmed ? { opacity: 0.65 } : undefined}>
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

      {photo.status === 'approved' && (
        <div className="mt-1">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => toggleFav(trip.id, dayId, photo.id)}
              aria-pressed={photo.fav}
              aria-label={t('favourite')}
              className="tap p-1 text-[var(--coral)]"
            >
              <Icon name={photo.fav ? 'heartFilled' : 'heart'} size={20} />
            </button>
            {author && <span className="text-[10px] text-[var(--muted)]">{author.name}</span>}
          </div>
          <ReactionBar reacts={photo.reacts} memberId={member.id} onToggle={(e) => reactPhoto(trip.id, dayId, photo.id, e, member.id)} />
        </div>
      )}

      {isPending && isParent && (
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => approvePhoto(trip.id, dayId, photo.id)}
            className="tap flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-full bg-white border border-[var(--line)] text-[var(--success)] text-sm font-semibold"
          >
            <Icon name="check" size={16} />
            {t('approve')}
          </button>
          <button
            type="button"
            onClick={() => rejectPhoto(trip.id, dayId, photo.id)}
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
