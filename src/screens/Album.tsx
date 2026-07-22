import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { canApprovePhotos } from '../lib/tripPermissions'
import { dayTabLabel } from '../lib/dayFormat'
import type { Photo, Member } from '../types'
import { PhotoTile } from '../components/PhotoTile'
import { TripHeader } from '../components/TripHeader'

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
        <TripHeader trip={trip} subtitle={t('album')} />

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
                    {d.title || t('dayNamePlaceholder')}{' '}
                    <span className="text-xs text-[var(--muted)]">
                      <bdi>{dayTabLabel(d.date)}</bdi>
                    </span>
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {photos.map((photo) => (
                      <PhotoTile
                        key={photo.id}
                        photo={photo}
                        tripId={trip.id}
                        dayId={d.id}
                        isParent={isParent}
                        member={member}
                        author={findMember(photo.by)}
                      />
                    ))}
                  </div>
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
                  <PhotoTile
                    key={photo.id}
                    photo={photo}
                    tripId={trip.id}
                    dayId={dayId}
                    isParent={isParent}
                    member={member}
                    author={findMember(photo.by)}
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
