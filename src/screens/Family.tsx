import { useNavigate } from 'react-router-dom'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { can } from '../lib/permissions'
import { buildInviteText } from '../lib/invite'
import { primaryTrip, todayISO } from '../lib/tripSelect'
import type { Member, Role } from '../types'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { LangToggle } from '../components/LangToggle'

export function Family() {
  const t = useT()
  const navigate = useNavigate()
  const me = useCurrentMember()!
  const members = useStore((s) => s.members)
  const trips = useStore((s) => s.trips)
  const setMemberRole = useStore((s) => s.setMemberRole)
  const logout = useStore((s) => s.logout)
  const showToast = useStore((s) => s.showToast)

  const canEditRoles = can(me.role, 'profile.editRole')
  const firstParent = members.find((m) => m.role === 'מבוגר') ?? me

  // Family stats.
  const tripCount = trips.length
  const photoCount = trips.reduce(
    (n, tr) => n + tr.days.reduce((m, d) => m + d.photos.length, 0),
    0,
  )
  const momentCount = trips.reduce(
    (n, tr) => n + tr.days.reduce((m, d) => m + d.entries.length, 0),
    0,
  )

  async function invite() {
    const trip = primaryTrip(trips, todayISO())
    if (!trip) {
      showToast(t('noTrips'))
      return
    }
    const text = buildInviteText(trip, t.lang)
    try {
      if (navigator.share) {
        await navigator.share({ title: trip.name, text })
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
      {/* Cover */}
      <div className="family-cover" />
      <div className="max-w-column mx-auto px-5 pb-5">
        {/* Header (avatar overlaps cover) */}
        <div className="flex flex-col items-center text-center -mt-10">
          <div className="rounded-[22px] border-4 border-white">
            <Avatar figure={me.figure} color={me.color} size={74} />
          </div>
          <h1 className="font-display text-2xl mt-2">{t.fn('familyOf')(firstParent.name)}</h1>
          <p className="text-sm text-[var(--muted)]">{t.fn('travellersCount')(members.length)}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 my-5">
          <div className="family-stat">
            <strong className="block text-lg">{tripCount}</strong>
            <span className="text-[10px] text-[var(--muted)]">{t('statTrips')}</span>
          </div>
          <div className="family-stat">
            <strong className="block text-lg">{photoCount}</strong>
            <span className="text-[10px] text-[var(--muted)]">{t('statPhotos')}</span>
          </div>
          <div className="family-stat">
            <strong className="block text-lg">{momentCount}</strong>
            <span className="text-[10px] text-[var(--muted)]">{t('statMoments')}</span>
          </div>
        </div>

        {/* Members */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-base">{t('familyMembers')}</h3>
          <button
            type="button"
            onClick={invite}
            className="tap inline-flex items-center gap-1 text-sm font-semibold text-[var(--coral)]"
          >
            <Icon name="plus" size={16} />
            {t('addMember')}
          </button>
        </div>

        <ul className="space-y-2">
          {members.map((m) => (
            <MemberCard
              key={m.id}
              m={m}
              isSelf={m.id === me.id}
              canEditRoles={canEditRoles}
              onEditSelf={() => navigate('/profile')}
              onRole={(role) => setMemberRole(m.id, role)}
              t={t}
            />
          ))}
        </ul>

        {/* Settings */}
        <h3 className="font-display text-base mt-6 mb-2">{t('settingsTitle')}</h3>
        <div className="space-y-2">
          <div className="settings-row">
            <Icon name="globe" size={18} className="text-[var(--muted)]" />
            <span className="text-sm">{t('changeLanguage')}</span>
            <span className="ms-auto">
              <LangToggle />
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/')
            }}
            className="settings-row tap text-[var(--danger)]"
          >
            <Icon name="close" size={18} />
            <span className="text-sm font-semibold">{t('logout')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function MemberCard({
  m,
  isSelf,
  canEditRoles,
  onEditSelf,
  onRole,
  t,
}: {
  m: Member
  isSelf: boolean
  canEditRoles: boolean
  onEditSelf: () => void
  onRole: (role: Role) => void
  t: ReturnType<typeof useT>
}) {
  const desc = m.role === 'מבוגר' ? t('roleAdultDesc') : t('roleChildDesc')
  // Parents may edit OTHER members' roles inline (not their own here — self edits via profile).
  const showRoleToggle = canEditRoles && !isSelf

  return (
    <li className="member-card">
      <Avatar figure={m.figure} color={m.color} size={44} />
      <div className="min-w-0">
        <h4 className="text-sm font-semibold truncate">
          {m.name}
          {isSelf && <span className="text-[var(--muted)] font-normal"> · {t('profile')}</span>}
        </h4>
        <p className="text-[11px] text-[var(--muted)]">{desc}</p>
        {showRoleToggle && (
          <div className="inline-flex mt-1.5 rounded-[12px] overflow-hidden border border-[var(--line)] bg-white" role="radiogroup" aria-label={t('roleLabel')}>
            {(['מבוגר', 'ילד'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={m.role === r}
                onClick={() => onRole(r)}
                className={`tap px-3 py-1 text-xs font-medium ${
                  m.role === r ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink)]'
                }`}
              >
                {r === 'מבוגר' ? t('roleAdult') : t('roleChild')}
              </button>
            ))}
          </div>
        )}
      </div>
      {isSelf && (
        <button
          type="button"
          onClick={onEditSelf}
          aria-label={t('edit')}
          className="tap p-2 text-[var(--ink)]"
        >
          <Icon name="edit" size={18} />
        </button>
      )}
    </li>
  )
}
