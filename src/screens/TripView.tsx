import { useState } from 'react'
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
import { mapsUrl } from '../lib/maps'
import { canPlanTrip } from '../lib/tripPermissions'
import { daysLostWithContent } from '../lib/days'
import type { Trip, Day, Activity, Entry, Member } from '../types'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { ReactionBar } from '../components/ReactionBar'

const MOODS = ['😍', '😄', '🌊', '🏔️', '🍦', '🚗', '✈️', '⭐']
const ACTIVITY_ICONS = ['🍽️', '🏖️', '🏔️', '🎡', '🚗', '✈️', '⛵', '🏨', '🛍️', '☕', '🎫', '📸']

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function stubLabel(trip: Trip, isFirst: boolean, t: ReturnType<typeof useT>): string {
  if (trip.transport === 'flight') return isFirst ? t('takeoff') : t('landing')
  return isFirst ? t('departByCar') : t('returnHome')
}

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
  const updateTripDates = useStore((s) => s.updateTripDates)
  const addEntry = useStore((s) => s.addEntry)
  const deleteEntry = useStore((s) => s.deleteEntry)
  const reactEntry = useStore((s) => s.reactEntry)

  const [dayIdx, setDayIdx] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!trip) return <Navigate to="/trips" replace />

  const canPlan = canPlanTrip(trip, member)
  const findMember = (id: string): Member | undefined => members.find((m) => m.id === id)
  const idx = Math.min(dayIdx, trip.days.length - 1)
  const day = trip.days[idx]

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

  const isFirst = idx === 0
  const isLast = idx === trip.days.length - 1
  const isStub = isFirst || isLast

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        {/* Header */}
        <button
          type="button"
          onClick={() => navigate('/trips')}
          className="tap inline-flex items-center gap-1 text-[var(--ink)] mb-4"
        >
          <Icon name="chevron" size={18} className="dir-back" />
          {t('back')}
        </button>

        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name={trip.transport === 'flight' ? 'plane' : 'car'} size={26} directional className="text-[var(--coral)] shrink-0" />
            <h1 className="font-hand text-2xl truncate">{trip.name}</h1>
          </div>
          {canPlan && (
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-label={t('tripSettings')}
              aria-expanded={settingsOpen}
              className="tap p-2 text-[var(--ink)] shrink-0"
            >
              <Icon name="edit" size={20} />
            </button>
          )}
        </div>
        <a
          href={mapsUrl(trip.destination)}
          target="_blank"
          rel="noopener"
          className="tap-chip gap-1 text-sm text-[var(--sea)] underline decoration-dotted mb-3"
        >
          <Icon name="mapPin" size={16} />
          <bdi>{trip.destination}</bdi>
        </a>

        {settingsOpen && canPlan && (
          <DateSettings
            trip={trip}
            t={t}
            onClose={() => setSettingsOpen(false)}
            onSave={(s, e) => {
              updateTripDates(trip.id, s, e)
              setSettingsOpen(false)
              setDayIdx(0)
            }}
          />
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          {/* Day tabs (also cross-day drop targets) */}
          <div className="tabs mb-4" role="tablist" aria-label={t('navPlan')}>
            {trip.days.map((d, i) => (
              <DayTab
                key={d.id}
                day={d}
                index={i}
                active={i === idx}
                canPlan={canPlan}
                onSelect={() => setDayIdx(i)}
              />
            ))}
          </div>

          {/* Transport stub for first/last day */}
          {isStub && (
            <div className="ticket-stub p-4 mb-4 flex items-center gap-2">
              <Icon name={trip.transport === 'flight' ? 'plane' : 'car'} size={22} directional className="text-[var(--coral)]" />
              <div>
                <div className="font-hand text-lg">{stubLabel(trip, isFirst, t)}</div>
                <div className="text-xs font-mono text-[var(--muted)]">
                  <bdi>{day.date}</bdi>
                </div>
              </div>
            </div>
          )}

          {/* Selected day */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-display text-lg">{day.title}</h2>
              <div className="text-xs text-[var(--muted)]">
                <bdi>{day.date}</bdi>
              </div>
            </div>
            <span className="text-lg font-display text-[var(--muted)]">{t('activities')}</span>
          </div>

          {day.activities.length === 0 && (
            <p className="text-sm text-[var(--muted)] mb-3">{t('noActivities')}</p>
          )}

          <SortableContext items={day.activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {day.activities.map((a) => (
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
        {canPlan && (
          <ActivityForm t={t} onSubmit={(a) => addActivity(trip.id, day.id, a)} />
        )}

        {/* ===== Journal ===== */}
        <section className="mt-8">
          <h2 className="font-display text-lg mb-2">{t('journal')}</h2>
          {day.entries.length === 0 && <p className="text-sm text-[var(--muted)] mb-3">—</p>}
          <ul className="space-y-3">
            {day.entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                author={findMember(entry.author)}
                canDelete={canPlan}
                onDelete={() => deleteEntry(trip.id, day.id, entry.id)}
                onReact={(emoji) => reactEntry(trip.id, day.id, entry.id, emoji, member.id)}
                memberId={member.id}
                t={t}
              />
            ))}
          </ul>
          {canPlan && <JournalForm t={t} onSubmit={(text, mood, loc) => addEntry(trip.id, day.id, { text, mood, loc, author: member.id })} />}
        </section>
      </div>
    </div>
  )
}

/** A day tab that is both selectable and a cross-day drop target. */
function DayTab({
  day,
  index,
  active,
  canPlan,
  onSelect,
}: {
  day: Day
  index: number
  active: boolean
  canPlan: boolean
  onSelect: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `daytab:${day.id}`, disabled: !canPlan })
  return (
    <button
      ref={setNodeRef}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={`tab tap ${active ? 'active' : ''} ${isOver ? 'ring-2 ring-[var(--coral)]' : ''}`}
    >
      {index + 1} · {day.title}
    </button>
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
    <li ref={setNodeRef} style={style} className="trip-card p-3 flex items-start gap-2">
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
      <span className="text-2xl leading-none mt-0.5" aria-hidden>
        {activity.icon || '📍'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {activity.time && <span className="chip-time text-[11px] px-2 py-0.5"><bdi>{activity.time}</bdi></span>}
          <h4 className="font-hand text-lg truncate">{activity.title}</h4>
        </div>
        {activity.loc && (
          <a
            href={mapsUrl(activity.loc)}
            target="_blank"
            rel="noopener"
            className="tap-chip gap-1 mt-1 text-xs text-[var(--sea)] font-semibold"
          >
            <Icon name="mapPin" size={14} />
            <bdi>{activity.loc}</bdi>
          </a>
        )}
        {activity.notes && <p className="text-xs text-[var(--muted)] mt-1">{activity.notes}</p>}
        {canPlan && (
          <div className="flex items-center gap-1 mt-2">
            <button type="button" onClick={() => setEditing(true)} aria-label={t('editActivity')} className="tap p-1.5 text-[var(--ink)]">
              <Icon name="edit" size={16} />
            </button>
            <button type="button" onClick={onDelete} aria-label={t('delete')} className="tap p-1.5 text-[var(--danger)]">
              <Icon name="trash" size={16} />
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
                    {d.title}
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
  const [open, setOpen] = useState(!!initial)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      time: time.trim() || undefined,
      icon: icon || undefined,
      loc: loc.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    if (!initial) {
      setTitle('')
      setTime('')
      setIcon('')
      setLoc('')
      setNotes('')
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
    <form onSubmit={submit} className={`space-y-2 ${initial ? '' : 'journal-lined p-4 mt-3'}`}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('activityTitle')}
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
      <div className="grid grid-cols-2 gap-2">
        <input
          type="time"
          dir="ltr"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          aria-label={t('activityTime')}
          className="tap w-full rounded-[14px] px-3 py-2 bg-white border border-[var(--line)] outline-none text-sm"
        />
        <input
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          placeholder={t('activityLoc')}
          className="tap w-full rounded-[14px] px-3 py-2 bg-white border border-[var(--line)] outline-none text-sm"
        />
      </div>
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t('activityNotes')}
        className="tap w-full rounded-[14px] px-3 py-2 bg-white border border-[var(--line)] outline-none text-sm"
      />
      <div className="flex gap-2">
        <button type="submit" className="primary-btn tap px-4 text-sm">
          {t('save')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="tap px-4 rounded-[14px] border border-[var(--line)] bg-white text-sm">
            {t('cancel')}
          </button>
        )}
      </div>
    </form>
  )
}

function DateSettings({
  trip,
  t,
  onClose,
  onSave,
}: {
  trip: Trip
  t: ReturnType<typeof useT>
  onClose: () => void
  onSave: (start: string, end: string) => void
}) {
  const [start, setStart] = useState(trip.startDate)
  const [end, setEnd] = useState(trip.endDate)
  const [confirm, setConfirm] = useState<number | null>(null)

  function attempt(e: React.FormEvent) {
    e.preventDefault()
    const lost = daysLostWithContent(start, end, trip.days)
    if (lost.length > 0) {
      setConfirm(lost.length)
      return
    }
    onSave(start, end)
  }

  return (
    <div className="journal-lined p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base">{t('editDates')}</h3>
        <button type="button" onClick={onClose} aria-label={t('cancel')} className="tap p-1 text-[var(--muted)]">
          <Icon name="close" size={18} />
        </button>
      </div>
      <form onSubmit={attempt} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">{t('startDate')}</label>
            <input type="date" dir="ltr" value={start} onChange={(e) => setStart(e.target.value)} className="tap w-full rounded-[14px] px-3 py-2 bg-white border border-[var(--line)] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t('endDate')}</label>
            <input type="date" dir="ltr" value={end} onChange={(e) => setEnd(e.target.value)} className="tap w-full rounded-[14px] px-3 py-2 bg-white border border-[var(--line)] outline-none" />
          </div>
        </div>
        {confirm !== null ? (
          <div role="alertdialog" aria-live="assertive" className="rounded-[14px] border border-[var(--danger)] bg-white p-3">
            <p className="text-sm font-semibold text-[var(--danger)] mb-1">{t('shrinkWarnTitle')}</p>
            <p className="text-sm text-[var(--ink)] mb-2">{t.fn('shrinkWarnBody')(confirm)}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => onSave(start, end)} className="tap px-4 py-2 rounded-[14px] bg-[var(--danger)] text-white text-sm font-semibold">
                {t('confirm')}
              </button>
              <button type="button" onClick={() => setConfirm(null)} className="tap px-4 py-2 rounded-[14px] border border-[var(--line)] bg-white text-sm">
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button type="submit" className="primary-btn tap px-4 text-sm">
            {t('save')}
          </button>
        )}
      </form>
    </div>
  )
}

function JournalForm({
  t,
  onSubmit,
}: {
  t: ReturnType<typeof useT>
  onSubmit: (text: string, mood: string, loc?: string) => void
}) {
  const [text, setText] = useState('')
  const [mood, setMood] = useState(MOODS[0])
  const [loc, setLoc] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    onSubmit(text.trim(), mood, loc.trim() || undefined)
    setText('')
    setLoc('')
  }

  return (
    <form onSubmit={submit} className="journal-lined mt-4 p-4">
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
  )
}

function EntryCard({
  entry,
  author,
  canDelete,
  onDelete,
  onReact,
  memberId,
  t,
}: {
  entry: Entry
  author?: Member
  canDelete: boolean
  onDelete: () => void
  onReact: (emoji: string) => void
  memberId: string
  t: ReturnType<typeof useT>
}) {
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
            <a href={mapsUrl(entry.loc)} target="_blank" rel="noopener" className="tap-chip gap-1 mt-1 text-xs text-[var(--sea)] font-semibold">
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
