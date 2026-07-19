import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import type { Figure, Role } from '../types'
import { useStore } from '../store/useStore'
import { useT } from '../i18n/useT'
import { RELATION_LABELS, defaultRoleFor } from '../lib/roleDefaults'
import { AvatarPicker } from '../components/AvatarPicker'
import { Logo } from '../components/Logo'
import { LangToggle } from '../components/LangToggle'

export function NewTraveller() {
  const t = useT()
  const navigate = useNavigate()
  const register = useStore((s) => s.registerMember)
  const location = useLocation() as { state?: { phone?: string } }
  const phone = location.state?.phone

  const [figure, setFigure] = useState<Figure>('person')
  const [color, setColor] = useState('linear-gradient(145deg,#42b8d4,#67d3bd)')
  const [relation, setRelation] = useState<string>('')
  const [role, setRole] = useState<Role>('ילד')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // No phone in navigation state → nothing to register; back to welcome.
  if (!phone) return <Navigate to="/" replace />

  function pickRelation(label: string) {
    setRelation(label)
    setRole(defaultRoleFor(label)) // auto-default, still overridable below
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    register({
      phone: phone!,
      name: name.trim() || relation || t('newTraveller'),
      role,
      figure,
      color,
      email: role === 'מבוגר' ? email.trim() || undefined : undefined,
    })
    navigate('/trips')
  }

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-6">
        <div className="flex justify-between items-center mb-5">
          <Logo variant="emboss" size="sm" />
          <LangToggle />
        </div>

        <h1 className="font-display text-2xl mb-1 text-[var(--ink-fountain)]">{t('newTraveller')}</h1>
        <p className="text-sm text-[var(--ink-pencil)] mb-4">
          {t('phoneLocked')}: <bdi className="font-mono">{phone}</bdi>
        </p>

        <form onSubmit={save} className="space-y-5">
          {/* locked phone */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('phoneLabel')}</label>
            <input
              type="tel"
              dir="ltr"
              value={phone}
              readOnly
              aria-readonly="true"
              className="tap w-full rounded-[14px] px-3 py-2.5 text-center bg-[var(--canvas)] border border-[var(--line)] text-[var(--muted)]"
            />
          </div>

          {/* relation pills */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('relationLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {RELATION_LABELS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => pickRelation(r)}
                  aria-pressed={relation === r}
                  className={`tap px-3 py-1.5 rounded-full text-sm border ${
                    relation === r
                      ? 'bg-[var(--ink)] text-white border-transparent'
                      : 'bg-white text-[var(--ink)] border-[var(--line)]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* figure picker */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('chooseFigure')}</label>
            <AvatarPicker figure={figure} color={color} onFigure={setFigure} onColor={setColor} />
          </div>

          {/* name */}
          <div>
            <label htmlFor="nt-name" className="block text-sm font-medium mb-1">
              {t('nameLabel')}
            </label>
            <input
              id="nt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
            />
          </div>

          {/* role segmented toggle */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('roleLabel')}</label>
            <div className="inline-flex rounded-[14px] overflow-hidden border border-[var(--line)] bg-white" role="radiogroup">
              {(['מבוגר', 'ילד'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={role === r}
                  onClick={() => setRole(r)}
                  className={`tap px-5 py-2 text-sm font-medium ${
                    role === r ? 'bg-[var(--ink)] text-white' : 'bg-white text-[var(--ink)]'
                  }`}
                >
                  {r === 'מבוגר' ? t('roleAdult') : t('roleChild')}
                </button>
              ))}
            </div>
          </div>

          {/* email — adults only, hides live */}
          {role === 'מבוגר' && (
            <div>
              <label htmlFor="nt-email" className="block text-sm font-medium mb-1">
                {t('emailLabel')}
              </label>
              <input
                id="nt-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
              />
            </div>
          )}

          <button type="submit" className="primary-btn tap w-full py-3 text-lg">
            {t('save')}
          </button>
        </form>
      </div>
    </div>
  )
}
