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
import { todayISO } from '../lib/tripSelect'
import { minReturnDate, isValidTripRange } from '../lib/tripDates'
import { seedTransportActivities } from '../lib/transportSeed'
import { AVATAR_GRADIENTS } from '../data/avatars'
import { Icon } from '../components/Icon'
import { AvatarPicker } from '../components/AvatarPicker'
import { ParticipantRow, type ParticipantDraft } from '../components/ParticipantRow'
import { Logo } from '../components/Logo'

interface DraftMember extends ParticipantDraft {
  key: string
}

export function TripForm() {
  const t = useT()
  const navigate = useNavigate()
  const member = useCurrentMember()!
  const addTrip = useStore((s) => s.addTrip)
  const addMember = useStore((s) => s.addMember)
  const updateProfile = useStore((s) => s.updateProfile)
  const setMemberRole = useStore((s) => s.setMemberRole)
  const showToast = useStore((s) => s.showToast)

  const [name, setName] = useState('')
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

  // ----- Trip-date validation (future departure, return on/after departure) --
  const today = todayISO()
  const dateError =
    startDate && startDate < today
      ? t('errDateInPast')
      : startDate && endDate && endDate < startDate
        ? t('errDateOrder')
        : ''
  const datesOk = isValidTripRange(startDate, endDate, today)

  function pickRelation(label: string) {
    setDRelation(label)
    setDRole(defaultRoleFor(label))
  }

  function addDraft() {
    if (!dName.trim() && !dRelation) return
    setDrafts((d) => [
      ...d,
      {
        key: `d-${Date.now()}-${d.length}`,
        name: dName.trim() || dRelation,
        figure: dFigure,
        color: dColor,
        role: dRole,
      },
    ])
    setDName('')
    setDFigure('person')
    setDColor(AVATAR_GRADIENTS[2])
    setDRelation('')
    setDRole('ילד')
    setAddOpen(false)
  }

  /** Edit the current user's own row — name/figure/colour, and role if allowed. */
  function editSelf(patch: Partial<ParticipantDraft>) {
    const { role, ...rest } = patch
    if (Object.keys(rest).length > 0) updateProfile(rest)
    if (role && can(member.role, 'profile.editRole')) setMemberRole(member.id, role)
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
    if (!datesOk) return // blocked — the inline error is already announced
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
    // Seed the first/last day with real, EDITABLE opening + closing legs.
    const days = seedTransportActivities(buildDays(startDate, endDate, []), transport)
    const trip = addTrip({
      name,
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
        <header className="flex justify-between items-center mb-4">
          <button
            type="button"
            onClick={() => navigate('/trips')}
            className="tap inline-flex items-center gap-1 text-[var(--ink)]"
          >
            <Icon name="chevron" size={18} className="dir-back" />
            {t('back')}
          </button>
          <Logo size="sm" />
        </header>

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

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('startDate')}>
              <input
                required
                type="date"
                dir="ltr"
                min={today}
                value={startDate}
                onChange={(e) => {
                  const v = e.target.value
                  setStartDate(v)
                  // Keep the range coherent when departure moves past the return.
                  if (endDate && v && endDate < v) setEndDate('')
                }}
                aria-invalid={!!dateError || undefined}
                className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
              />
            </Field>
            <Field label={t('endDate')}>
              <input
                required
                type="date"
                dir="ltr"
                disabled={!startDate}
                min={minReturnDate(startDate) || undefined}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-invalid={!!dateError || undefined}
                className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none disabled:opacity-50"
              />
            </Field>
          </div>

          <p aria-live="polite" className="text-sm text-[var(--danger)] min-h-[1.25rem]">
            {dateError}
          </p>

          {/* Transport segmented toggle */}
          <Field label={t('transport')}>
            <div
              className="inline-flex rounded-[14px] overflow-hidden border border-[var(--line)] bg-white"
              role="radiogroup"
              aria-label={t('transport')}
            >
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

          {/* ===== Participants — every row editable ===== */}
          <section className="pt-2">
            <h2 className="font-display text-lg mb-2">{t('wizardParticipants')}</h2>
            <ul className="space-y-2">
              {/* Current user — editable, but never removable. */}
              <ParticipantRow
                value={{ name: member.name, figure: member.figure, color: member.color, role: member.role }}
                isSelf
                canEditRole={can(member.role, 'profile.editRole')}
                onChange={editSelf}
              />
              {drafts.map((d) => (
                <ParticipantRow
                  key={d.key}
                  value={d}
                  onChange={(patch) =>
                    setDrafts((list) => list.map((x) => (x.key === d.key ? { ...x, ...patch } : x)))
                  }
                  onRemove={() => setDrafts((list) => list.filter((x) => x.key !== d.key))}
                />
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
                  aria-label={t('participantName')}
                  className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none"
                />
                <AvatarPicker figure={dFigure} color={dColor} onFigure={setDFigure} onColor={setDColor} />
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
                      aria-checked={dRole === r}
                      onClick={() => setDRole(r)}
                      className={`tap px-5 py-2 text-sm font-medium ${
                        dRole === r ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink)]'
                      }`}
                    >
                      {r === 'מבוגר' ? t('roleAdult') : t('roleChild')}
                    </button>
                  ))}
                </div>
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
                <button
                  type="button"
                  onClick={copyCode}
                  className="tap px-3 py-2 rounded-[14px] bg-white border border-[var(--line)] text-sm inline-flex items-center gap-1"
                >
                  <Icon name="check" size={16} />
                  {t('copyCode')}
                </button>
                <button
                  type="button"
                  onClick={shareInvite}
                  className="tap px-3 py-2 rounded-[14px] bg-white border border-[var(--line)] text-sm inline-flex items-center gap-1"
                >
                  <Icon name="share" size={16} />
                  {t('share')}
                </button>
              </div>
            </div>
          </section>

          <button type="submit" disabled={!datesOk} className="primary-btn tap w-full py-3 text-lg disabled:opacity-50">
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
