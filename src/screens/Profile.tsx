import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Figure, Role } from '../types'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { can } from '../lib/permissions'
import { AvatarPicker } from '../components/AvatarPicker'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { LangToggle } from '../components/LangToggle'
import { BrandMark } from '../components/Logo'

export function Profile() {
  const t = useT()
  const navigate = useNavigate()
  const member = useCurrentMember()!
  const updateProfile = useStore((s) => s.updateProfile)
  const logout = useStore((s) => s.logout)

  const [name, setName] = useState(member.name)
  const [figure, setFigure] = useState<Figure>(member.figure)
  const [color, setColor] = useState(member.color)
  const [role, setRole] = useState<Role>(member.role)
  const canEditRole = can(member.role, 'profile.editRole')

  function save(e: React.FormEvent) {
    e.preventDefault()
    updateProfile({ name: name.trim() || member.name, figure, color, role: canEditRole ? role : member.role })
    navigate('/trips')
  }

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <header className="flex justify-between items-center mb-5">
          <button
            type="button"
            onClick={() => navigate('/trips')}
            className="tap inline-flex items-center gap-1 text-[var(--ink)]"
          >
            <Icon name="chevron" size={18} className="dir-back" />
            {t('back')}
          </button>
          <div className="flex items-center gap-2">
            <LangToggle />
            <BrandMark size={28} />
          </div>
        </header>

        <div className="flex items-center gap-3 mb-5">
          <Avatar figure={figure} color={color} size={56} />
          <div>
            <h1 className="font-display text-2xl text-[var(--ink-fountain)]">{t('profile')}</h1>
            <p className="text-sm text-[var(--ink-pencil)] font-mono">
              <bdi>{member.phone}</bdi>
            </p>
          </div>
        </div>

        <form onSubmit={save} className="space-y-5">
          <div>
            <label htmlFor="pf-name" className="block text-sm font-medium mb-1">
              {t('nameLabel')}
            </label>
            <input
              id="pf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('changeAvatar')}</label>
            <AvatarPicker figure={figure} color={color} onFigure={setFigure} onColor={setColor} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('roleLabel')}</label>
            {canEditRole ? (
              <div className="inline-flex rounded-[14px] overflow-hidden border border-[var(--line)] bg-white" role="radiogroup">
                {(['מבוגר', 'ילד'] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={role === r}
                    onClick={() => setRole(r)}
                    className={`tap px-5 py-2 text-sm font-medium ${
                      role === r ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink)]'
                    }`}
                  >
                    {r === 'מבוגר' ? t('roleAdult') : t('roleChild')}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <span className="inline-block px-4 py-2 rounded-[14px] bg-[var(--canvas)] border border-[var(--line)] text-sm font-medium">
                  {member.role === 'מבוגר' ? t('roleAdult') : t('roleChild')}
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">{t('roleLockedHint')}</p>
              </div>
            )}
          </div>

          <button type="submit" className="primary-btn tap w-full py-3 text-lg">
            {t('save')}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/')
          }}
          className="tap w-full mt-4 py-2 text-[var(--danger)] underline"
        >
          {t('logout')}
        </button>
      </div>
    </div>
  )
}
