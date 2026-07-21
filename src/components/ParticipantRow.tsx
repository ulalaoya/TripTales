import { useState } from 'react'
import { useT } from '../i18n/useT'
import type { Figure, Role } from '../types'
import { Avatar } from './Avatar'
import { AvatarPicker } from './AvatarPicker'
import { Icon } from './Icon'

export interface ParticipantDraft {
  name: string
  figure: Figure
  color: string
  role: Role
}

interface Props {
  value: ParticipantDraft
  /** Marks the row as the current user ("את/ה") — never removable. */
  isSelf?: boolean
  /** False → role is fixed and the locked hint is shown (child rule). */
  canEditRole?: boolean
  onChange: (patch: Partial<ParticipantDraft>) => void
  /** Omitted for rows that cannot be removed (i.e. the current user). */
  onRemove?: () => void
}

/**
 * An editable participant row (Galli feedback #7): every participant —
 * including the current user — can have their name, figure + avatar colour and
 * role changed. Shared by the trip wizard and /trips/:tripId/people.
 */
export function ParticipantRow({ value, isSelf, canEditRole = true, onChange, onRemove }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)

  return (
    <li className={open ? 'journal-lined p-4 space-y-3' : 'member-card'}>
      {open ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar figure={value.figure} color={value.color} size={40} />
              <strong className="text-sm truncate">
                {value.name || t('participantName')}
                {isSelf && <span className="text-[var(--muted)] font-normal"> · {t('youLabel')}</span>}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="tap px-3 py-2 rounded-[14px] border border-[var(--line)] bg-white text-xs"
            >
              {t('doneEditing')}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('nameLabel')}</label>
            <input
              value={value.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={t('participantName')}
              aria-label={t('nameLabel')}
              className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
            />
          </div>

          <div>
            <span className="block text-sm font-medium mb-2">{t('changeAvatar')}</span>
            <AvatarPicker
              figure={value.figure}
              color={value.color}
              onFigure={(figure) => onChange({ figure })}
              onColor={(color) => onChange({ color })}
            />
          </div>

          <div>
            <span className="block text-sm font-medium mb-2">{t('roleLabel')}</span>
            {canEditRole ? (
              <div
                className="inline-flex rounded-[14px] overflow-hidden border border-[var(--line)] bg-white"
                role="radiogroup"
                aria-label={t('roleLabel')}
              >
                {(['מבוגר', 'ילד'] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={value.role === r}
                    onClick={() => onChange({ role: r })}
                    className={`tap px-5 py-2 text-sm font-medium ${
                      value.role === r ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink)]'
                    }`}
                  >
                    {r === 'מבוגר' ? t('roleAdult') : t('roleChild')}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <span className="inline-block px-4 py-2 rounded-[14px] bg-[var(--canvas)] border border-[var(--line)] text-sm font-medium">
                  {value.role === 'מבוגר' ? t('roleAdult') : t('roleChild')}
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">{t('roleLockedHint')}</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <Avatar figure={value.figure} color={value.color} size={44} />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold truncate">
              {value.name || t('participantName')}
              {isSelf && <span className="text-[var(--muted)] font-normal"> · {t('youLabel')}</span>}
            </h4>
            <p className="text-[11px] text-[var(--muted)]">
              {value.role === 'מבוגר' ? t('roleAdultDesc') : t('roleChildDesc')}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t('editParticipant')}
              className="tap p-2 text-[var(--ink)]"
            >
              <Icon name="edit" size={18} />
            </button>
            {onRemove && (
              <button type="button" onClick={onRemove} aria-label={t('removeMember')} className="tap p-2 text-[var(--danger)]">
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
        </>
      )}
    </li>
  )
}
