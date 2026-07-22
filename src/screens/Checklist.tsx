import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { checklistProgress, groupProgress, canEditChecklist } from '../lib/checklist'
import { canAddChecklistItem } from '../lib/checklistPerms'
import type { ChecklistGroup, Member } from '../types'
import { Icon } from '../components/Icon'
import { TripHeader } from '../components/TripHeader'

const GROUP_EMOJIS = ['🎒', '👕', '🧴', '🎫', '🍫', '🧸', '🔌', '💊']

export function Checklist() {
  const t = useT()
  const { tripId } = useParams()
  const member = useCurrentMember()!
  const members = useStore((s) => s.members)
  const trip = useStore((s) => s.trips.find((x) => x.id === tripId))

  const toggleItem = useStore((s) => s.toggleChecklistItem)
  const addGroup = useStore((s) => s.addChecklistGroup)

  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupEmoji, setGroupEmoji] = useState(GROUP_EMOJIS[0])

  if (!trip) return <Navigate to="/trips" replace />

  const canEdit = canEditChecklist(member.role)
  const canAddItem = canAddChecklistItem(member.role)
  const checklist = trip.checklist ?? []
  const { done, total, pct } = checklistProgress(checklist)
  const memberName = (id: string): string =>
    id === 'all' ? t('everyone') : members.find((m) => m.id === id)?.name ?? t('everyone')

  function submitGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!groupName.trim()) return
    addGroup(trip!.id, { name: groupName.trim(), emoji: groupEmoji })
    setGroupName('')
    setGroupEmoji(GROUP_EMOJIS[0])
    setNewGroupOpen(false)
  }

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <TripHeader trip={trip} subtitle={t('packTitle')} />

        {/* Progress head */}
        <div className="check-head mb-4">
          <div>
            <h3 className="font-display text-base">{t('almostReady')}</h3>
            <p className="text-xs text-[var(--muted)] mt-1">{t.fn('packedCount')(done, total)}</p>
          </div>
          <div
            className="ring"
            style={{ '--pct': pct } as React.CSSProperties}
            role="img"
            aria-label={`${pct}%`}
          >
            <strong>{pct}%</strong>
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-5">
          {checklist.map((group) => (
            <ChecklistGroupCard
              key={group.id}
              group={group}
              tripId={trip.id}
              canEdit={canEdit}
              canAddItem={canAddItem}
              members={members}
              memberName={memberName}
              onToggle={(itemId) => toggleItem(trip.id, group.id, itemId)}
            />
          ))}
        </div>

        {/* New group — parent only */}
        {canEdit && (
          <div className="mt-5">
            {newGroupOpen ? (
              <form onSubmit={submitGroup} className="journal-lined p-4 space-y-3">
                <label className="block text-sm font-medium">{t('groupNameLabel')}</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
                  autoFocus
                />
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('newGroup')}>
                  {GROUP_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      role="radio"
                      aria-checked={groupEmoji === em}
                      onClick={() => setGroupEmoji(em)}
                      className={`emoji-btn tap ${groupEmoji === em ? 'selected' : ''}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="primary-btn tap px-4 text-sm">
                    {t('save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewGroupOpen(false)}
                    className="tap px-4 rounded-[14px] border border-[var(--line)] bg-white text-sm"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" onClick={() => setNewGroupOpen(true)} className="add-card tap">
                <Icon name="plus" size={18} />
                {t('newGroup')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ChecklistGroupCard({
  group,
  tripId,
  canEdit,
  canAddItem,
  members,
  memberName,
  onToggle,
}: {
  group: ChecklistGroup
  tripId: string
  canEdit: boolean
  canAddItem: boolean
  members: Member[]
  memberName: (id: string) => string
  onToggle: (itemId: string) => void
}) {
  const t = useT()
  const addItem = useStore((s) => s.addChecklistItem)
  const deleteItem = useStore((s) => s.deleteChecklistItem)
  const deleteGroup = useStore((s) => s.deleteChecklistGroup)
  const gp = groupProgress(group)

  const [label, setLabel] = useState('')
  const [owner, setOwner] = useState<string>('all')

  function submitItem(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    addItem(tripId, group.id, { label: label.trim(), owner })
    setLabel('')
    setOwner('all')
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <h4 className="font-display text-base flex items-center gap-2">
          <span aria-hidden>{group.emoji}</span>
          {group.name}
        </h4>
        <span className="tag text-[10px] px-2 py-1">{t.fn('groupCount')(gp.done, gp.total)}</span>
        {canEdit && (
          <button
            type="button"
            onClick={() => deleteGroup(tripId, group.id)}
            aria-label={t('delete')}
            className="tap p-1.5 text-[var(--danger)] ms-auto"
          >
            <Icon name="trash" size={16} />
          </button>
        )}
      </div>

      <div>
        {group.items.map((item) => (
          <div key={item.id} className={`check-item ${item.done ? 'done' : ''}`}>
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              role="checkbox"
              aria-checked={item.done}
              aria-label={item.label}
              className="tap grid place-items-center -m-2.5 p-2.5"
            >
              <span className="checkbox">{item.done && <Icon name="check" size={14} />}</span>
            </button>
            <span className="check-label flex-1">{item.label}</span>
            <span className="owner">
              <bdi>{memberName(item.owner)}</bdi>
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => deleteItem(tripId, group.id, item.id)}
                aria-label={t('delete')}
                className="tap p-1 text-[var(--danger)]"
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add item — open to EVERY member (Galli feedback #16) */}
      {canAddItem && (
        <form onSubmit={submitItem} className="flex flex-wrap items-center gap-2 mt-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('itemLabel')}
            className="tap flex-1 min-w-[8rem] bg-white rounded-[14px] px-3 py-2 text-sm border border-[var(--line)] outline-none"
          />
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            aria-label={t('ownerLabel')}
            className="tap bg-white rounded-[14px] px-3 py-2 text-sm border border-[var(--line)] outline-none"
          >
            <option value="all">{t('everyone')}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button type="submit" className="primary-btn tap px-4 text-sm inline-flex items-center gap-1">
            <Icon name="plus" size={16} />
            {t('addItem')}
          </button>
        </form>
      )}
    </section>
  )
}
