import { useState } from 'react'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { Logo } from '../components/Logo'
import { LangToggle } from '../components/LangToggle'
import { ReactionBar } from '../components/ReactionBar'
import { Icon } from '../components/Icon'
import type { Photo } from '../types'

interface FlatPhoto {
  photo: Photo
  tripId: string
  dayId: string
  tripName: string
}

export function useApprovedPhotos(onlyFav = false): FlatPhoto[] {
  const trips = useStore((s) => s.trips)
  const out: FlatPhoto[] = []
  for (const trip of trips) {
    for (const day of trip.days) {
      for (const photo of day.photos) {
        if (photo.status !== 'approved') continue
        if (onlyFav && !photo.fav) continue
        out.push({ photo, tripId: trip.id, dayId: day.id, tripName: trip.name })
      }
    }
  }
  return out
}

export function PhotoWall({ items, empty }: { items: FlatPhoto[]; empty: string }) {
  const t = useT()
  const member = useCurrentMember()!
  const toggleFav = useStore((s) => s.toggleFav)
  const reactPhoto = useStore((s) => s.reactPhoto)

  if (items.length === 0) return <p className="text-sm text-[var(--muted)]">{empty}</p>

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map(({ photo, tripId, dayId, tripName }) => (
        <div key={photo.id} className="relative">
          <div className="gallery-tile">
            {photo.svg ? (
              <span dangerouslySetInnerHTML={{ __html: photo.svg }} />
            ) : (
              <img src={photo.src} alt={photo.caption} />
            )}
            <div className="tile-caption font-hand text-sm truncate">{photo.caption}</div>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => toggleFav(tripId, dayId, photo.id)}
              aria-pressed={photo.fav}
              aria-label={t('favourite')}
              className="tap p-1 text-[var(--coral)]"
            >
              <Icon name={photo.fav ? 'heartFilled' : 'heart'} size={20} />
            </button>
            <span className="text-[10px] text-[var(--muted)] truncate">{tripName}</span>
          </div>
          <ReactionBar reacts={photo.reacts} memberId={member.id} onToggle={(e) => reactPhoto(tripId, dayId, photo.id, e, member.id)} />
        </div>
      ))}
    </div>
  )
}

export function Album() {
  const t = useT()
  const [tab, setTab] = useState<'all' | 'fav'>('all')
  const all = useApprovedPhotos(false)
  const favs = useApprovedPhotos(true)
  const items = tab === 'fav' ? favs : all
  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <header className="flex justify-between items-center mb-5">
          <Logo variant="emboss" size="sm" />
          <LangToggle />
        </header>
        <h1 className="font-display text-2xl text-[var(--ink-fountain)] mb-4">{t('album')}</h1>

        {/* Filter tabs — הכל / מועדפים */}
        <div className="tabs mb-4" role="tablist" aria-label={t('album')}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'all'}
            onClick={() => setTab('all')}
            className={`tab tap ${tab === 'all' ? 'active' : ''}`}
          >
            {t('tabAll')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'fav'}
            onClick={() => setTab('fav')}
            className={`tab tap ${tab === 'fav' ? 'active' : ''}`}
          >
            {t('favourites')}
          </button>
        </div>

        <PhotoWall items={items} empty={tab === 'fav' ? t('noFavourites') : t('noPhotos')} />
      </div>
    </div>
  )
}
