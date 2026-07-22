import { useStore } from '../store/useStore'
import { useT } from '../i18n/useT'
import type { Member, Photo } from '../types'
import { Icon } from './Icon'
import { ReactionBar } from './ReactionBar'

interface Props {
  photo: Photo
  tripId: string
  dayId: string
  /** Viewer may approve/reject pending photos on this trip. */
  isParent: boolean
  member: Member
  author?: Member
}

/**
 * One gallery tile: photo, caption, favourite + reactions once approved, and a
 * pending pill with אישור/דחייה for trip-parents. Shared by the Album and the
 * planner's per-day photo strip (Galli feedback #3) so both behave identically.
 */
export function PhotoTile({ photo, tripId, dayId, isParent, member, author }: Props) {
  const t = useT()
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
          <div className="pending-pill absolute top-2 text-[10px] z-10 px-2 py-0.5" style={{ insetInlineStart: 8 }}>
            {t('pending')}
          </div>
        )}
        {/* Favourite is a clearly-labelled STAR on the image corner — no longer a
            heart next to the name that got confused with the chosen reaction
            emoji (Galli feedback #13). */}
        {photo.status === 'approved' && (
          <button
            type="button"
            onClick={() => toggleFav(tripId, dayId, photo.id)}
            aria-pressed={photo.fav}
            aria-label={t('favourite')}
            className="tap absolute top-1 z-10 p-1.5"
            style={{ insetInlineEnd: 6, color: photo.fav ? 'var(--sun)' : '#fff' }}
          >
            <Icon name="star" size={20} style={photo.fav ? { fill: 'currentColor' } : undefined} />
          </button>
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
          {/* [uploader name] · [emoji reactions from members] — no decorative heart */}
          {author && (
            <div className="flex items-center gap-1 text-[11px]">
              <span className="font-semibold text-[var(--ink)] truncate">{author.name}</span>
              <span className="text-[var(--muted)]" aria-hidden>·</span>
            </div>
          )}
          <ReactionBar
            reacts={photo.reacts}
            memberId={member.id}
            onToggle={(e) => reactPhoto(tripId, dayId, photo.id, e, member.id)}
          />
        </div>
      )}

      {isPending && isParent && (
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => approvePhoto(tripId, dayId, photo.id)}
            className="tap flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-full bg-white border border-[var(--line)] text-[var(--success)] text-sm font-semibold"
          >
            <Icon name="check" size={16} />
            {t('approve')}
          </button>
          <button
            type="button"
            onClick={() => rejectPhoto(tripId, dayId, photo.id)}
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
