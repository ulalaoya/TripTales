import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import type { Transport, Figure, Role } from '../types'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { can } from '../lib/permissions'
import { buildDays } from '../lib/days'
import { generateJoinCode } from '../lib/joinCode'
import { buildInviteText } from '../lib/invite'
import { RELATION_LABELS, defaultRoleFor } from '../lib/roleDefaults'
import { AVATAR_GRADIENTS } from '../data/avatars'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { AvatarPicker } from '../components/AvatarPicker'

interface DraftMember {
  key: string
  name: string
  figure: Figure
  color: string
  role: Role
}

export function TripForm() {
  const t = useT()
  const navigate = useNavigate()
  const member = useCurrentMember()!
  const addTrip = useStore((s) => s.addTrip)
  const addMember = useStore((s) => s.addMember)
  const showToast = useStore((s) => s.showToast)

  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [transport, setTransport] = useState<Transport>('flight')
  const [idea, setIdea] = useState(false)
  const [drafts, setDrafts] = useState<DraftMember[]>([])
  const [joinCode] = useState(() => generateJoinCode())

  // Inline add-member sub-form.
  const [addOpen, setAddOpen] = useState(false)
  const [dName, setDName] = useState('')
  const [dFigure, setDFigure] = useState<Figure>('person')
  const [dColor, setDColor] = useState<string>(AVATAR_GRADIENTS[2])
  const [dRelation, setDRelation] = useState('')
  const [dRole, setDRole] = useState<Role>('ילד')

  // Route guard — children may not create trips.
  if (!can(member.role, 'trip.create')) return <Navigate to="/trips" replace />

  function pickRelation(label: string) {
    setDRelation(label)
    setDRole(defaultRoleFor(label))
  }

  function addDraft() {
    if (!dName.trim() && !dRelation) return
    setDrafts((d) => [
      ...d,
      { key: `d-${Date.now()}-${d.length}`, name: dName.trim() || dRelation, figure: dFigure, color: dColor, role: dRole },
    ])
    setDName('')
    setDFigure('person')
    setDColor(AVATAR_GRADIENTS[2])
    setDRelation('')
    setDRole('ילד')
    setAddOpen(false)
  }

  async function shareInvite() {
    const stub = { name: name || t('newTripTitle'), startDate, endDate } as never
    const text = buildInviteText(stub, t.lang, joinCode)
    try {
      if (navigator.share) {
        await navigator.share({ title: name || 'TripTales', text })
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

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(joinCode)
      showToast(t('codeCopied'))
    } catch {
      /* ignore */
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    // Create real members for each draft participant, collect all member ids.
    const draftIds = drafts.map((d) =>
      addMember({
        phone: '',
        name: d.name,
        role: d.role,
        figure: d.figure,
        color: d.color,
        email: undefined,
      }).id,
    )
    const days = buildDays(startDate, endDate, [])
    const trip = addTrip({
      name,
      destination,
      startDate,
      endDate,
      transport,
      idea,
      days,
      members: [member.id, ...draftIds],
      joinCode,
    })
    navigate(`/trips/${trip.id}`)
  }

  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <button
          type="button"
          onClick={() => navigate('/trips')}
          className="tap inline-flex items-center gap-1 text-[var(--ink)] mb-4"
        >
          <Icon name="chevron" size={18} className="dir-back" />
          {t('back')}
        </button>

        <h1 className="font-display text-2xl mb-4">{t('newTripTitle')}</h1>

        <form onSubmit={save} className="space-y-4">
          <Field label={t('tripName')}>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
            />
          </Field>

          <Field label={t('destination')}>
            <input
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('startDate')}>
              <input
                required
                type="date"
                dir="ltr"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
              />
            </Field>
            <Field label={t('endDate')}>
              <input
                required
                type="date"
                dir="ltr"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
              />
            </Field>
          </div>

          {/* Transport segmented toggle */}
          <Field label={t('transport')}>
            <div className="inline-flex rounded-[14px] overflow-hidden border border-[var(--line)] bg-white" role="radiogroup" aria-label={t('transport')}>
              {(['flight', 'drive'] as Transport[]).map((tr) => (
                <button
                  key={tr}
                  type="button"
                  role="radio"
                  aria-checked={transport === tr}
                  onClick={() => setTransport(tr)}
                  className={`tap inline-flex items-center gap-1 px-4 py-2 text-sm font-medium ${
                    transport === tr ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink)]'
                  }`}
                >
                  <Icon name={tr === 'flight' ? 'plane' : 'car'} size={18} directional />
                  {tr === 'flight' ? t('flight') : t('drive')}
                </button>
              ))}
            </div>
          </Field>

          {/* Idea-only toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={idea}
              onClick={() => setIdea((v) => !v)}
              className={`tap relative w-12 h-7 rounded-full transition ${idea ? 'bg-[var(--coral)]' : 'bg-[var(--line)]'}`}
            >
              <span
                className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
                style={{ insetInlineStart: idea ? '1.5rem' : '0.25rem' }}
              />
            </button>
            <span className="text-sm font-medium">{t('ideaOnly')}</span>
          </label>

          {/* ===== Participants ===== */}
          <section className="pt-2">
            <h2 className="font-display text-lg mb-2">{t('wizardParticipants')}</h2>
            <ul className="space-y-2">
              {/* Current user (auto-added) */}
              <li className="member-card">
                <Avatar figure={member.figure} color={member.color} size={44} />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold truncate">
                    {member.name} <span className="text-[var(--muted)] font-normal">· {t('youLabel')}</span>
                  </h4>
                  <p className="text-[11px] text-[var(--muted)]">
                    {member.role === 'מבוגר' ? t('roleAdultDesc') : t('roleChildDesc')}
                  </p>
                </div>
                <span />
              </li>
              {drafts.map((d) => (
                <li key={d.key} className="member-card">
                  <Avatar figure={d.figure} color={d.color} size={44} />
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold truncate">{d.name}</h4>
                    <p className="text-[11px] text-[var(--muted)]">
                      {d.role === 'מבוגר' ? t('roleAdultDesc') : t('roleChildDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrafts((list) => list.filter((x) => x.key !== d.key))}
                    aria-label={t('removeMember')}
                    className="tap p-2 text-[var(--danger)]"
                  >
                    <Icon name="close" size={18} />
                  </button>
                </li>
              ))}
            </ul>

            {addOpen ? (
              <div className="journal-lined p-4 mt-2 space-y-3">
                {/* relation pills (auto role) */}
                <div className="flex flex-wrap gap-2">
                  {RELATION_LABELS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => pickRelation(r)}
                      aria-pressed={dRelation === r}
                      className={`tap px-3 py-1.5 rounded-full text-sm border ${
                        dRelation === r
                          ? 'bg-[var(--ink)] text-white border-transparent'
                          : 'bg-white text-[var(--ink)] border-[var(--line)]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  value={dName}
                  onChange={(e) => setDName(e.target.value)}
                  placeholder={t('participantName')}
                  className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
                />
                <AvatarPicker figure={dFigure} color={dColor} onFigure={setDFigure} onColor={setDColor} />
                <div className="flex gap-2">
                  <button type="button" onClick={addDraft} className="primary-btn tap px-4 text-sm">
                    {t('save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="tap px-4 rounded-[14px] border border-[var(--line)] bg-white text-sm"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setAddOpen(true)} className="add-card tap mt-2">
                <Icon name="plus" size={18} />
                {t('addParticipant')}
              </button>
            )}
          </section>

          {/* ===== Share & join code ===== */}
          <section className="pt-2">
            <h2 className="font-display text-lg mb-2">{t('inviteShare')}</h2>
            <div className="check-head">
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">{t('joinCodeLabel')}</p>
                <strong className="font-mono text-2xl tracking-[0.2em]">
                  <bdi>{joinCode}</bdi>
                </strong>
              </div>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={copyCode} className="tap px-3 py-2 rounded-[14px] bg-white border border-[var(--line)] text-sm inline-flex items-center gap-1">
                  <Icon name="check" size={16} />
                  {t('copyCode')}
                </button>
                <button type="button" onClick={shareInvite} className="tap px-3 py-2 rounded-[14px] bg-white border border-[var(--line)] text-sm inline-flex items-center gap-1">
                  <Icon name="share" size={16} />
                  {t('share')}
                </button>
              </div>
            </div>
          </section>

          <button type="submit" className="primary-btn tap w-full py-3 text-lg">
            {t('createTripCta')}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  )
}
