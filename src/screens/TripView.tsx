import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { locationHref, locationLabel } from '../lib/locationLink'
import { canPlanTrip, isTripMember } from '../lib/tripPermissions'
import { dayTabLabel, weekdayParts } from '../lib/dayFormat'
import { sortActivitiesByTime } from '../lib/sortActivities'
import { initialDayIndex, todayISO } from '../lib/tripSelect'
import type { Day, Activity, ActivityAttachment, Member, Photo } from '../types'
import { Icon } from '../components/Icon'
import { LocationField } from '../components/LocationField'
import { AttachmentField } from '../components/AttachmentField'
import { PhotoTile } from '../components/PhotoTile'
import { TripHeader } from '../components/TripHeader'

const ACTIVITY_ICONS = ['🍽️', '🏖️', '🏔️', '🎡', '🚗', '✈️', '⛵', '🏨', '🛍️', '☕', '🎫', '📸']

/** Minimum horizontal travel (px) that counts as a day-changing swipe. */
const SWIPE_MIN_PX = 45

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function TripView() {
  const t = useT()
  const navigate = useNavigate()
  const { tripId } = useParams()
  const member = useCurrentMember()!
  const members = useStore((s) => s.members)
  const trip = useStore((s) => s.trips.find((x) => x.id === tripId))

  const addActivity = useStore((s) => s.addActivity)
  const updateActivity = useStore((s) => s.updateActivity)
  const deleteActivity = useStore((s) => s.deleteActivity)
  const reorderActivity = useStore((s) => s.reorderActivity)
  const moveActivity = useStore((s) => s.moveActivity)
  const updateDayTitle = useStore((s) => s.updateDayTitle)
  const addPhoto = useStore((s) => s.addPhoto)
  const showToast = useStore((s) => s.showToast)
  const setActiveDay = useStore((s) => s.setActiveDay)

  // Open on TODAY's day when the trip is running (falls back to the first/last
  // day outside the trip's range) — see `lib/tripSelect.initialDayIndex`.
  const [dayIdx, setDayIdx] = useState(() => initialDayIndex(trip?.days ?? [], todayISO()))
  /** Start point of an in-progress horizontal swipe (see onTouchStart/End). */
  const swipeRef = useRef<{ x: number; y: number } | null>(null)

  // Reorder only on a deliberate LONG-PRESS (Galli feedback — Item 2). With a
  // delay + tolerance activation, a quick swipe over the list scrolls normally
  // and a drag begins only after a ~250ms press-and-hold on an activity; moving
  // more than `tolerance` px before the delay elapses cancels it (= a scroll).
  // The KeyboardSensor and the "העברה ליום…" <select> keep a11y reordering.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Remember the day being viewed so the ➕ "new moment" composer defaults to it
  // (Galli feedback — Item 1). Guarded so it stays inert when the trip is gone.
  const daysLen = trip?.days.length ?? 0
  useEffect(() => {
    if (!trip) return
    const d = trip.days[Math.min(dayIdx, daysLen - 1)]
    if (d) setActiveDay(trip.id, d.id)
  }, [trip, dayIdx, daysLen, setActiveDay])

  if (!trip) return <Navigate to="/trips" replace />
  // A trip should always have ≥1 day, but a malformed/partial trip (e.g. a
  // mid-sync cloud document) must never crash the planner into a white screen.
  if (trip.days.length === 0) return <Navigate to="/trips" replace />

  const canPlan = canPlanTrip(trip, member)
  const canUpload = isTripMember(trip, member.id)
  const findMember = (id: string): Member | undefined => members.find((m) => m.id === id)
  const idx = Math.min(dayIdx, trip.days.length - 1)
  const day = trip.days[idx]

  /**
   * Display order is time-sorted (timed ascending, untimed after in manual
   * order). Drag indices are resolved against the STORE order, so a drop lands
   * the dragged activity at the target's stored position.
   */
  const ordered = day ? sortActivitiesByTime(day.activities) : []

  function onDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id)
    const overId = e.over ? String(e.over.id) : null
    if (!overId || !day) return
    if (overId.startsWith('daytab:')) {
      const toDayId = overId.slice('daytab:'.length)
      if (toDayId !== day.id) {
        const toDay = trip!.days.find((d) => d.id === toDayId)
        moveActivity(trip!.id, day.id, toDayId, activeId, toDay ? toDay.activities.length : 0)
      }
      return
    }
    const from = day.activities.findIndex((a) => a.id === activeId)
    const to = day.activities.findIndex((a) => a.id === overId)
    if (from >= 0 && to >= 0 && from !== to) reorderActivity(trip!.id, day.id, from, to)
  }

  /**
   * Swipe left/right to move between days (Galli feedback).
   *
   * Swiping LEFT→RIGHT moves FORWARD to the next day, and right→left goes back
   * (Galli's chosen direction). Swipes that start inside the scrollable tab
   * strip are ignored (that gesture scrolls the strip), as are mostly-vertical
   * drags, so normal scrolling is untouched.
   */
  function onTouchStart(e: React.TouchEvent) {
    if ((e.target as HTMLElement).closest?.('.tabs')) {
      swipeRef.current = null
      return
    }
    const p = e.touches[0]
    swipeRef.current = { x: p.clientX, y: p.clientY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = swipeRef.current
    swipeRef.current = null
    if (!start || !trip) return
    const p = e.changedTouches[0]
    const dx = p.clientX - start.x
    const dy = p.clientY - start.y
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.2) return
    const step = dx > 0 ? 1 : -1
    const last = trip.days.length - 1
    setDayIdx((i) => Math.max(0, Math.min(last, Math.min(i, last) + step)))
  }

  /** Photos of this day the viewer may see: approved, own pending, or all for parents. */
  const visiblePhotos: Photo[] = day
    ? day.photos.filter((p) => p.status === 'approved' || canPlan || p.by === member.id)
    : []

  return (
    /* `touch-action: pan-y` is what actually makes the swipe fire on a phone:
       without it the browser claims horizontal gestures (page pan / overscroll)
       and delivers `touchcancel` instead of `touchend`. Vertical scrolling and
       pinch-zoom stay untouched; the day strip re-enables pan-x in CSS. */
    <div
      className="paper min-h-full"
      style={{ touchAction: 'pan-y pinch-zoom' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        swipeRef.current = null
      }}
    >
      <div className="max-w-column mx-auto px-5 py-5">
        <TripHeader
          trip={trip}
          action={
            canPlan ? (
              <button
                type="button"
                onClick={() => navigate(`/trips/${trip.id}/people`)}
                aria-label={t('tripSettings')}
                className="tap p-2 text-[var(--ink)] shrink-0"
              >
                <Icon name="settings" size={20} />
              </button>
            ) : undefined
          }
        />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          {/* Day tabs — navigated by DATE (also cross-day drop targets) */}
          <div className="tabs mb-4" role="tablist" aria-label={t('navPlan')}>
            {trip.days.map((d, i) => (
              <DayTab key={d.id} day={d} active={i === idx} canPlan={canPlan} onSelect={() => setDayIdx(i)} />
            ))}
          </div>

          {/* Selected day — the NAME is the heading, editable by planners.
              Keyed by day.id so its inline-edit draft state resets per day and
              never bleeds across day tabs (Galli feedback #12). */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <DayTitle
              key={day.id}
              title={day.title}
              canPlan={canPlan}
              t={t}
              onSave={(title) => updateDayTitle(trip.id, day.id, title)}
            />
            <span className="text-xl font-display text-[var(--muted)] shrink-0">{t('activities')}</span>
          </div>

          {ordered.length === 0 && <p className="text-sm text-[var(--muted)] mb-3">{t('noActivities')}</p>}

          <SortableContext items={ordered.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {ordered.map((a) => (
                <ActivityCard
                  key={a.id}
                  activity={a}
                  canPlan={canPlan}
                  otherDays={trip.days.filter((d) => d.id !== day.id)}
                  t={t}
                  onEdit={(patch) => updateActivity(trip.id, day.id, a.id, patch)}
                  onDelete={() => deleteActivity(trip.id, day.id, a.id)}
                  onMoveTo={(toDayId) => {
                    const toDay = trip.days.find((d) => d.id === toDayId)
                    moveActivity(trip.id, day.id, toDayId, a.id, toDay ? toDay.activities.length : 0)
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {/* Add activity — parents of the trip */}
        {/* Keyed by day so an open draft never follows you to another day. */}
        {canPlan && <ActivityForm key={day.id} t={t} onSubmit={(a) => addActivity(trip.id, day.id, a)} />}

        {/* ===== This day's photos ===== */}
        <section className="mt-8">
          <h2 className="font-display text-2xl mb-2">{t('dayPhotos')}</h2>
          {visiblePhotos.length === 0 ? (
            <p className="text-sm text-[var(--muted)] mb-3">{t('noPhotos')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-3">
              {visiblePhotos.map((p) => (
                <PhotoTile
                  key={p.id}
                  photo={p}
                  tripId={trip.id}
                  dayId={day.id}
                  isParent={canPlan}
                  member={member}
                  author={findMember(p.by)}
                />
              ))}
            </div>
          )}
          {canUpload && (
            <DayPhotoButton
              t={t}
              onPick={(dataUrl) => {
                const status = addPhoto(
                  trip.id,
                  day.id,
                  { src: dataUrl, caption: '', by: member.id },
                  member.role,
                )
                showToast(status === 'pending' ? t('sentForApproval') : t('momentSaved'))
              }}
            />
          )}
        </section>
      </div>
    </div>
  )
}

/** A day tab labelled by DATE, selectable and a cross-day drop target. */
function DayTab({
  day,
  active,
  canPlan,
  onSelect,
}: {
  day: Day
  active: boolean
  canPlan: boolean
  onSelect: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `daytab:${day.id}`, disabled: !canPlan })
  const parts = weekdayParts(day.date)
  return (
    <button
      ref={setNodeRef}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={`tab tab-day tap ${active ? 'active' : ''} ${isOver ? 'ring-2 ring-[var(--coral)]' : ''}`}
    >
      <bdi className="tab-day-word">{parts.word}</bdi>
      <bdi className="tab-day-letter">{parts.letter}</bdi>
      <bdi className="tab-day-date">{parts.date}</bdi>
    </button>
  )
}

/** The day's NAME, shown as the heading and editable inline by trip-planners. */
function DayTitle({
  title,
  canPlan,
  t,
  onSave,
}: {
  title: string
  canPlan: boolean
  t: ReturnType<typeof useT>
  onSave: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)

  function commit() {
    onSave(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setDraft(title)
              setEditing(false)
            }
          }}
          autoFocus
          aria-label={t('editDayName')}
          placeholder={t('dayNamePlaceholder')}
          className="tap flex-1 min-w-0 rounded-[14px] px-3 py-2 bg-white border border-[var(--line)] outline-none font-display text-2xl"
        />
        <button type="button" onClick={commit} aria-label={t('save')} className="tap p-2 text-[var(--success)]">
          <Icon name="check" size={18} />
        </button>
      </div>
    )
  }

  const heading = (
    <h2 className={`font-display text-2xl truncate ${title ? '' : 'text-[var(--muted)]'}`}>
      {title || t('dayNamePlaceholder')}
    </h2>
  )

  if (!canPlan) return <div className="min-w-0">{heading}</div>

  return (
    <div className="flex items-center gap-1 min-w-0">
      <button
        type="button"
        onClick={() => {
          setDraft(title)
          setEditing(true)
        }}
        aria-label={t('editDayName')}
        className="tap flex items-center gap-1.5 min-w-0 text-start"
      >
        {heading}
        <Icon name="edit" size={16} className="text-[var(--muted)] shrink-0" />
      </button>
    </div>
  )
}

/** "הוספת תמונה" straight from the planner — same permissions as the + tab. */
function DayPhotoButton({ t, onPick }: { t: ReturnType<typeof useT>; onPick: (dataUrl: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onPick(String(reader.result))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <>
      <button type="button" onClick={() => fileRef.current?.click()} className="add-card tap">
        <Icon name="camera" size={18} />
        {t('addPhoto')}
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
    </>
  )
}

function ActivityCard({
  activity,
  canPlan,
  otherDays,
  t,
  onEdit,
  onDelete,
  onMoveTo,
}: {
  activity: Activity
  canPlan: boolean
  otherDays: Day[]
  t: ReturnType<typeof useT>
  onEdit: (patch: Partial<Omit<Activity, 'id'>>) => void
  onDelete: () => void
  onMoveTo: (toDayId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
    disabled: !canPlan,
  })
  const [editing, setEditing] = useState(false)
  /** Data-URL of the attachment shown full-screen, or null. */
  const [lightbox, setLightbox] = useState<string | null>(null)
  const attachments = activity.attachments ?? (activity.attachment ? [activity.attachment] : [])

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: prefersReducedMotion() ? undefined : transition,
    opacity: isDragging ? 0.6 : 1,
  }

  if (editing) {
    return (
      <li ref={setNodeRef} style={style} className="journal-lined p-3">
        <ActivityForm
          t={t}
          initial={activity}
          onSubmit={(patch) => {
            onEdit(patch)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li ref={setNodeRef} style={style} className="trip-card p-3 relative flex items-start gap-2">
      {/* Delete moved to the TOP-LEFT corner (Galli feedback #9) so it is never
          tapped by accident. Still a ≥44px tap target, visually a small chip. */}
      {canPlan && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('delete')}
          className="tap absolute top-1.5 p-1.5 text-[var(--danger)] z-10"
          style={{ insetInlineEnd: 6 }}
        >
          <Icon name="trash" size={16} />
        </button>
      )}
      {canPlan && (
        <button
          type="button"
          className="tap grid place-items-center text-[var(--muted)] cursor-grab touch-none -m-1 p-1"
          aria-label={t('dragHandleLabel')}
          {...attributes}
          {...listeners}
        >
          <Icon name="chevron" size={16} style={{ transform: 'rotate(90deg)' }} />
        </button>
      )}
      <div className="flex-1 min-w-0 pe-7">
        {/* RTL reading order right→left: TIME (big/bold) → icon → name (#11). */}
        <div className="flex items-center gap-2">
          {activity.time && (
            <span className="text-lg font-extrabold text-[var(--coral)] shrink-0 leading-none">
              <bdi>{activity.time}</bdi>
            </span>
          )}
          <span className="text-2xl leading-none shrink-0" aria-hidden>
            {activity.icon || '📍'}
          </span>
          <h4 className="font-hand text-lg truncate">{activity.title}</h4>
        </div>
        {/* Location on its OWN line — links used to sit flush beside it. */}
        {activity.loc && (
          <div className="mt-1">
            <a
              href={locationHref(activity.loc)}
              target="_blank"
              rel="noopener"
              className="tap-chip gap-1 text-xs text-[var(--sea)] font-semibold"
            >
              <Icon name="mapPin" size={14} />
              <bdi>{locationLabel(activity.loc)}</bdi>
            </a>
          </div>
        )}
        {activity.notes && <p className="text-xs text-[var(--muted)] mt-1">{activity.notes}</p>}

        {/* Attachments — EACH on its own row (an activity can have several). */}
        {attachments.map((att, i) =>
          att.kind === 'photo' ? (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(att.value)}
              aria-label={att.label ?? t('attachTitle')}
              className="tap mt-2 block rounded-[12px] overflow-hidden border border-[var(--line)]"
            >
              <img
                src={att.value}
                alt={att.label ?? t('attachTitle')}
                style={{ width: 64, height: 64, objectFit: 'cover', display: 'block' }}
              />
            </button>
          ) : (
            <div key={i} className="mt-1.5">
              <a
                href={att.value}
                target="_blank"
                rel="noopener"
                className="tap-chip gap-1 text-xs text-[var(--sea)] font-semibold"
              >
                <Icon name="share" size={14} />
                <bdi>{att.label || t('attachOpenLink')}</bdi>
              </a>
            </div>
          ),
        )}
        {lightbox && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('attachTitle')}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-50 grid place-items-center p-5"
            style={{ background: 'rgba(23, 31, 48, .82)' }}
          >
            <img
              src={lightbox}
              alt={t('attachTitle')}
              style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 14 }}
            />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label={t('cancel')}
              className="tap absolute top-4 p-2 text-white"
              style={{ insetInlineEnd: 16 }}
            >
              <Icon name="close" size={24} />
            </button>
          </div>
        )}

        {canPlan && (
          <div className="flex items-center gap-1 mt-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={t('editActivity')}
              className="tap p-1.5 text-[var(--ink)]"
            >
              <Icon name="edit" size={16} />
            </button>
            {otherDays.length > 0 && (
              <select
                aria-label={t('moveToDay')}
                value=""
                onChange={(e) => {
                  if (e.target.value) onMoveTo(e.target.value)
                }}
                className="tap ms-auto bg-white rounded-[12px] px-2 py-1 text-xs border border-[var(--line)] outline-none max-w-[9rem]"
              >
                <option value="">{t('moveToDay')}</option>
                {otherDays.map((d) => (
                  <option key={d.id} value={d.id}>
                    {dayTabLabel(d.date)} · {d.title || t('dayNamePlaceholder')}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function ActivityForm({
  t,
  initial,
  onSubmit,
  onCancel,
}: {
  t: ReturnType<typeof useT>
  initial?: Activity
  onSubmit: (a: Omit<Activity, 'id'>) => void
  onCancel?: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [time, setTime] = useState(initial?.time ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '')
  const [loc, setLoc] = useState(initial?.loc ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [attachments, setAttachments] = useState<ActivityAttachment[]>(
    initial?.attachments ?? (initial?.attachment ? [initial.attachment] : []),
  )
  const [open, setOpen] = useState(!!initial)

  /** Reset every field back to empty (shared by cancel and by a fresh add). */
  function reset() {
    setTitle('')
    setTime('')
    setIcon('')
    setLoc('')
    setNotes('')
    setAttachments([])
  }

  /**
   * Close without saving. When editing, hand back to the caller; when ADDING,
   * clear the draft and collapse back to the "הוספת פעילות" button — previously
   * an opened add-form had no way out at all (Galli feedback).
   */
  function cancel() {
    if (onCancel) {
      onCancel()
      return
    }
    reset()
    setOpen(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      time: time.trim() || undefined,
      icon: icon || undefined,
      loc: loc.trim() || undefined,
      notes: notes.trim() || undefined,
      // Drop half-typed empty links so an unfinished row is never saved.
      attachments: attachments.filter((a) => a.value.trim()),
    })
    if (!initial) {
      reset()
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="add-card tap mt-3">
        <Icon name="plus" size={18} />
        {t('addActivity')}
      </button>
    )
  }

  return (
    <form onSubmit={submit} className={`space-y-3 ${initial ? '' : 'journal-lined p-4 mt-3'}`}>
      {/* Always-available way out of the composer. */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-lg">{initial ? t('editActivity') : t('addActivity')}</span>
        <button type="button" onClick={cancel} aria-label={t('cancel')} className="tap p-1.5 text-[var(--muted)]">
          <Icon name="close" size={20} />
        </button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('activityTitle')}
        aria-label={t('activityTitle')}
        autoFocus
        className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none font-hand text-lg"
      />
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t('activityIcon')}>
        {ACTIVITY_ICONS.map((em) => (
          <button
            key={em}
            type="button"
            role="radio"
            aria-checked={icon === em}
            onClick={() => setIcon((cur) => (cur === em ? '' : em))}
            className={`emoji-btn tap ${icon === em ? 'selected' : ''}`}
          >
            {em}
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="act-time" className="block text-xs font-semibold mb-1">
          {t('activityTimeLabel')}
        </label>
        <input
          id="act-time"
          type="time"
          dir="ltr"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          aria-label={t('activityTimeLabel')}
          className="tap w-full rounded-[14px] px-3 py-2 bg-white border border-[var(--line)] outline-none text-sm"
        />
      </div>

      <LocationField value={loc} onChange={setLoc} />

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t('activityNotes')}
        aria-label={t('activityNotes')}
        className="tap w-full rounded-[14px] px-3 py-2 bg-white border border-[var(--line)] outline-none text-sm"
      />

      <AttachmentField value={attachments} onChange={setAttachments} />

      <div className="flex gap-2">
        <button type="submit" className="primary-btn tap px-4 text-sm">
          {t('save')}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="tap px-4 rounded-[14px] border border-[var(--line)] bg-white text-sm"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}

