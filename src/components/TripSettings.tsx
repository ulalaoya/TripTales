import { useRef, useState } from 'react'
import { useStore, useCurrentMember } from '../store/useStore'
import { useT } from '../i18n/useT'
import { coverPhotoOf } from '../lib/tripCover'
import { PALETTES } from '../lib/palettes'
import { daysLostWithContent } from '../lib/days'
import { readImageFile } from '../lib/readImageFile'
import type { Trip, Photo, Transport } from '../types'
import { Icon } from './Icon'
import { ThemeToggle } from './ThemeToggle'

/**
 * Trip metadata editor — name, transport icon, cover photo and dates.
 *
 * Lives on the trip's Settings screen (the bottom-nav "הגדרות" tab), NOT as a
 * pop-over panel anymore (Galli feedback Items 2 + 4 + 9): every save is
 * confirmed with a toast and the screen simply stays put, so nothing ever feels
 * "stuck open". Adults who can plan the trip are the only ones who reach it.
 */
export function TripSettings({ trip }: { trip: Trip }) {
  const t = useT()
  const updateTrip = useStore((s) => s.updateTrip)
  const updateTripDates = useStore((s) => s.updateTripDates)
  const addPhoto = useStore((s) => s.addPhoto)
  const showToast = useStore((s) => s.showToast)
  const lang = useStore((s) => s.lang)
  const member = useCurrentMember()
  // The palette and the colour scheme are APP-WIDE settings (Galli feedback),
  // edited from here but never stored on the trip.
  const activePalette = useStore((s) => s.paletteId)
  const setPaletteId = useStore((s) => s.setPaletteId)
  const theme = useStore((s) => s.theme)

  const [name, setName] = useState(trip.name)
  const [start, setStart] = useState(trip.startDate)
  const [end, setEnd] = useState(trip.endDate)
  const [confirm, setConfirm] = useState<number | null>(null)
  const [coverOpen, setCoverOpen] = useState(false)
  const [reading, setReading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Every approved photo across the trip's album — the cover candidates.
  const approved: Photo[] = []
  for (const d of trip.days) for (const p of d.photos) if (p.status === 'approved') approved.push(p)
  const current = coverPhotoOf(trip)

  function saveInfo(patch: Partial<Trip>) {
    updateTrip(trip.id, patch)
    showToast(t('tripInfoSaved'))
  }

  /**
   * Upload a photo straight from Settings, not tied to a particular day
   * (Galli feedback). It lands in the trip's album (attached to the first day)
   * with the normal approval flow, so it can then be picked as the cover below.
   */
  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be chosen again later
    const firstDay = trip.days[0]
    if (!file || !member || !firstDay) return
    setReading(true)
    readImageFile(file)
      .then((dataUrl) => {
        // `general: true` → shown under "כללי" in the album, not under day 1.
        const status = addPhoto(
          trip.id,
          firstDay.id,
          { src: dataUrl, caption: '', by: member.id, general: true },
          member.role,
        )
        showToast(status === 'pending' ? t('sentForApproval') : t('momentSaved'))
      })
      .catch(() => showToast(t('photoRequired')))
      .finally(() => setReading(false))
  }

  function commitName() {
    const next = name.trim()
    if (next && next !== trip.name) saveInfo({ name: next })
  }

  function commitDates() {
    updateTripDates(trip.id, start, end)
    setConfirm(null)
    showToast(t('datesSaved'))
  }

  function attemptDates(e: React.FormEvent) {
    e.preventDefault()
    const lost = daysLostWithContent(start, end, trip.days)
    if (lost.length > 0) {
      setConfirm(lost.length)
      return
    }
    commitDates()
  }

  return (
    <div className="journal-lined p-4 mb-4 space-y-4">
      <h3 className="font-display text-2xl flex items-center gap-2">
        <Icon name="settings" size={18} className="text-[var(--coral)]" />
        {t('editTripInfo')}
      </h3>

      {/* Trip NAME */}
      <div>
        <label htmlFor="ts-name" className="block text-xs font-medium mb-1">{t('tripName')}</label>
        <input
          id="ts-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          className="tap w-full rounded-[14px] px-3 py-2.5 bg-white border border-[var(--line)] outline-none text-lg font-bold"
        />
      </div>

      {/* Trip ICON — transport */}
      <div>
        <span className="block text-xs font-medium mb-1">{t('tripIconLabel')}</span>
        <div
          className="inline-flex rounded-[14px] overflow-hidden border border-[var(--line)] bg-white"
          role="radiogroup"
          aria-label={t('tripIconLabel')}
        >
          {(['flight', 'drive'] as Transport[]).map((tr) => (
            <button
              key={tr}
              type="button"
              role="radio"
              aria-checked={trip.transport === tr}
              onClick={() => saveInfo({ transport: tr })}
              className={`tap inline-flex items-center gap-1 px-4 py-2 text-sm font-medium ${
                trip.transport === tr ? 'bg-[var(--solid)] text-[var(--on-solid)]' : 'text-[var(--ink)]'
              }`}
            >
              <Icon name={tr === 'flight' ? 'plane' : 'car'} size={18} directional />
              {tr === 'flight' ? t('flight') : t('drive')}
            </button>
          ))}
        </div>
      </div>

      {/* Add a photo straight from Settings (not tied to a day) */}
      <div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={reading}
          aria-busy={reading}
          className="secondary-btn tap w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm"
        >
          <Icon name="camera" size={18} />
          {reading ? t('photoProcessing') : t('addTripPhoto')}
        </button>
      </div>

      {/* Cover photo picker — collapsed behind a toggle so a trip with dozens of
          photos does not flood the settings screen (Galli feedback). */}
      <div>
        <span className="block text-xs font-medium mb-1">{t('coverPhotoLabel')}</span>
        {approved.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t('noApprovedPhotos')}</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setCoverOpen((o) => !o)}
              aria-expanded={coverOpen}
              className="secondary-btn tap w-full inline-flex items-center justify-between gap-2 py-2.5 px-3 text-sm"
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="album" size={18} />
                {t('chooseCover')}
                <span className="text-[var(--muted)]">({approved.length})</span>
              </span>
              <Icon
                name="chevron"
                size={16}
                style={{ transform: `rotate(${coverOpen ? -90 : 90}deg)` }}
              />
            </button>
            {coverOpen && (
          <div className="grid grid-cols-4 gap-2 mt-2">
            <button
              type="button"
              onClick={() => saveInfo({ coverPhotoId: undefined })}
              aria-pressed={!trip.coverPhotoId}
              className={`tap rounded-[12px] border p-1 text-[10px] leading-tight text-center ${
                !trip.coverPhotoId ? 'border-[var(--coral)] ring-2 ring-[var(--coral)]' : 'border-[var(--line)]'
              }`}
              style={{ minHeight: 56 }}
            >
              {t('coverFirstPhoto')}
            </button>
            {approved.map((p) => {
              const chosen = current?.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => saveInfo({ coverPhotoId: p.id })}
                  aria-pressed={chosen}
                  aria-label={p.caption || t('coverPhotoLabel')}
                  className={`tap rounded-[12px] overflow-hidden border ${
                    chosen ? 'border-[var(--coral)] ring-2 ring-[var(--coral)]' : 'border-[var(--line)]'
                  }`}
                >
                  {p.svg ? (
                    <span className="block" dangerouslySetInnerHTML={{ __html: p.svg }} />
                  ) : (
                    <img src={p.src} alt={p.caption} style={{ display: 'block', width: '100%', height: 56, objectFit: 'cover' }} />
                  )}
                </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Day / night mode — also reachable here, not only from the home header. */}
      <div>
        <span className="block text-xs font-medium mb-1">{t('appearance')}</span>
        <div className="flex items-center justify-between rounded-[14px] border border-[var(--line)] bg-white px-3 py-2">
          <span className="text-sm font-bold text-[var(--ink)]">
            {theme === 'dark' ? t('darkMode') : t('lightMode')}
          </span>
          <ThemeToggle />
        </div>
      </div>

      {/* Colour palette — applies to the WHOLE app, not just this trip. */}
      <div>
        <span className="block text-xs font-medium">{t('paletteLabel')}</span>
        <p className="text-xs text-[var(--muted)] mb-1.5">{t('paletteAppWide')}</p>
        <div className="space-y-2" role="radiogroup" aria-label={t('paletteLabel')}>
          {PALETTES.map((p) => {
            const chosen = activePalette === p.id
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={chosen}
                onClick={() => {
                  setPaletteId(p.id)
                  showToast(t('tripInfoSaved'))
                }}
                className={`tap w-full flex items-center gap-2 rounded-[14px] border p-2 bg-white ${
                  chosen ? 'border-[var(--coral)] ring-2 ring-[var(--coral)]' : 'border-[var(--line)]'
                }`}
              >
                <span className="flex rounded-md overflow-hidden shrink-0" aria-hidden>
                  {p.swatch.map((c, i) => (
                    <span key={i} style={{ background: c, width: 16, height: 22 }} />
                  ))}
                </span>
                <span className="text-sm text-[var(--ink)] truncate">{p.name[lang]}</span>
                {chosen && <Icon name="check" size={16} className="text-[var(--coral)] ms-auto" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dates — extend to add days, shrink to remove */}
      <form onSubmit={attemptDates} className="space-y-3">
        <span className="block text-xs font-medium">{t('editDates')}</span>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">{t('startDate')}</label>
            <input
              type="date"
              dir="ltr"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="tap w-full rounded-[14px] px-3 py-2 bg-white border border-[var(--line)] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t('endDate')}</label>
            <input
              type="date"
              dir="ltr"
              value={end}
              min={start || undefined}
              onChange={(e) => setEnd(e.target.value)}
              className="tap w-full rounded-[14px] px-3 py-2 bg-white border border-[var(--line)] outline-none"
            />
          </div>
        </div>
        {confirm !== null ? (
          <div role="alertdialog" aria-live="assertive" className="rounded-[14px] border border-[var(--danger)] bg-white p-3">
            <p className="text-sm font-semibold text-[var(--danger)] mb-1">{t('shrinkWarnTitle')}</p>
            <p className="text-sm text-[var(--ink)] mb-2">{t.fn('shrinkWarnBody')(confirm)}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={commitDates}
                className="tap px-4 py-2 rounded-[14px] bg-[var(--danger)] text-white text-sm font-semibold"
              >
                {t('confirm')}
              </button>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="tap px-4 py-2 rounded-[14px] border border-[var(--line)] bg-white text-sm"
              >
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
