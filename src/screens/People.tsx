import { useParams, Navigate } from 'react-router-dom'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { canPlanTrip } from '../lib/tripPermissions'
import { can } from '../lib/permissions'
import { buildInviteText } from '../lib/invite'
import type { Member } from '../types'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { ParticipantRow, type ParticipantDraft } from '../components/ParticipantRow'

export function People() {
  const t = useT()
  const { tripId } = useParams()
  const me = useCurrentMember()!
  const members = useStore((s) => s.members)
  const trip = useStore((s) => s.trips.find((x) => x.id === tripId))
  const updateMember = useStore((s) => s.updateMember)
  const updateProfile = useStore((s) => s.updateProfile)
  const setMemberRole = useStore((s) => s.setMemberRole)
  const removeTripMember = useStore((s) => s.removeTripMember)
  const showToast = useStore((s) => s.showToast)

  if (!trip) return <Navigate to="/trips" replace />
  const canManage = canPlanTrip(trip, me)
  const tripMembers = trip.members.map((id) => members.find((m) => m.id === id)).filter(Boolean) as Member[]

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(trip!.joinCode)
      showToast(t('codeCopied'))
    } catch {
      /* ignore */
    }
  }

  async function share() {
    const text = buildInviteText(trip!, t.lang, trip!.joinCode)
    try {
      if (navigator.share) {
        await navigator.share({ title: trip!.name, text })
        return
      }
    } catch {
      /* cancelled */
    }
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
    showToast(t('copied'))
  }

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <h1 className="font-display text-2xl mb-1">{t('tripMembersTitle')}</h1>
        <p className="text-sm text-[var(--muted)] mb-4">
          <bdi>{trip.name}</bdi>
        </p>

        {/* Join code panel */}
        <div className="check-head mb-2">
          <div>
            <p className="text-xs text-[var(--muted)] mb-1">{t('joinCodeLabel')}</p>
            <strong className="font-mono text-2xl tracking-[0.2em]">
              <bdi>{trip.joinCode}</bdi>
            </strong>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={copyCode} className="tap px-3 py-2 rounded-[14px] bg-white border border-[var(--line)] text-sm inline-flex items-center gap-1">
              <Icon name="check" size={16} />
              {t('copyCode')}
            </button>
            <button type="button" onClick={share} className="tap px-3 py-2 rounded-[14px] bg-white border border-[var(--line)] text-sm inline-flex items-center gap-1">
              <Icon name="share" size={16} />
              {t('share')}
            </button>
          </div>
        </div>
        <p className="text-xs text-[var(--muted)] mb-4">{t('pickAvatarHint')}</p>

        <ul className="space-y-2">
          {tripMembers.map((m) => {
            const isSelf = m.id === me.id

            // Trip-planners edit every row (Galli feedback #7). Everyone else
            // sees read-only rows; a member always edits their own details.
            if (!canManage && !isSelf) {
              return (
                <li key={m.id} className="member-card">
                  <Avatar figure={m.figure} color={m.color} size={44} />
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold truncate">{m.name}</h4>
                    <p className="text-[11px] text-[var(--muted)]">
                      {m.role === 'מבוגר' ? t('roleAdultDesc') : t('roleChildDesc')}
                    </p>
                  </div>
                  <span />
                </li>
              )
            }

            function onChange(patch: Partial<ParticipantDraft>) {
              if (isSelf) {
                const { role, ...rest } = patch
                if (Object.keys(rest).length > 0) updateProfile(rest)
                if (role && can(me.role, 'profile.editRole')) setMemberRole(m.id, role)
                return
              }
              updateMember(m.id, patch)
            }

            return (
              <ParticipantRow
                key={m.id}
                value={{ name: m.name, figure: m.figure, color: m.color, role: m.role }}
                isSelf={isSelf}
                canEditRole={can(me.role, 'profile.editRole')}
                onChange={onChange}
                // The current user can never remove themselves.
                onRemove={isSelf || !canManage ? undefined : () => removeTripMember(trip!.id, m.id)}
              />
            )
          })}
        </ul>
      </div>
    </div>
  )
}
