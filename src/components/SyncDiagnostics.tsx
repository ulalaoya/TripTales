import { useState } from 'react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n/useT'
import { isCloudEnabled } from '../lib/firebase'
import { cloudDiagnostics } from '../lib/cloud'
import { Icon } from './Icon'

/**
 * A collapsed panel showing what the sync layer is actually doing.
 *
 * It exists because "my phone and my computer don't see each other" could not be
 * diagnosed from the outside: the decisive facts (does each device hold the SAME
 * trip id, is this device subscribed to it, is any traffic flowing) live inside
 * the client. Open it on both devices and compare — or copy and send it.
 */
export function SyncDiagnostics() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const showToast = useStore((s) => s.showToast)
  // Subscribing to trips/syncState keeps the readout fresh while it is open.
  useStore((s) => s.trips)
  useStore((s) => s.syncState)

  if (!isCloudEnabled) return null

  const data = open ? cloudDiagnostics() : null
  const text = data ? JSON.stringify(data, null, 2) : ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      showToast(t('copied'))
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="tap w-full inline-flex items-center justify-between gap-2 rounded-[14px] border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="cloud" size={18} />
          {t('syncDiagnostics')}
        </span>
        <Icon name="chevron" size={16} style={{ transform: `rotate(${open ? -90 : 90}deg)` }} />
      </button>

      {open && data && (
        <div className="mt-2 space-y-2">
          <ul className="rounded-[14px] border border-[var(--line)] bg-white p-3 space-y-1 text-xs">
            <Row label={t('syncDiagState')} value={String(data.syncState)} />
            <Row label={t('syncDiagDevice')} value={String(data.uid ?? '—')} />
            <Row label={t('syncDiagLastPush')} value={String(data.lastPush ?? '—')} />
            <Row label={t('syncDiagLastPull')} value={String(data.lastPull ?? '—')} />
            {data.lastError ? <Row label={t('syncDiagError')} value={String(data.lastError)} /> : null}
          </ul>

          <ul className="rounded-[14px] border border-[var(--line)] bg-white p-3 space-y-2 text-xs">
            {(data.trips as Array<Record<string, unknown>>).map((tr) => (
              <li key={String(tr.id)} className="border-b border-[var(--line)] last:border-0 pb-2 last:pb-0">
                <p className="font-bold truncate">{String(tr.name)}</p>
                <p dir="ltr" className="font-mono text-[var(--muted)] break-all">
                  {String(tr.id)}
                </p>
                <p className="text-[var(--muted)]">
                  {t('syncDiagActivities')}: {String(tr.activities)} ·{' '}
                  {tr.inCloud ? '☁︎' : '✗'} {t('syncDiagInCloud')} ·{' '}
                  {tr.uidInMemberUids ? '✓' : '✗'} {t('syncDiagSubscribed')}
                </p>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={copy}
            className="secondary-btn tap w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm"
          >
            <Icon name="share" size={16} />
            {t('syncDiagCopy')}
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <span className="text-[var(--muted)] shrink-0">{label}</span>
      <span dir="ltr" className="font-mono text-end break-all">
        {value}
      </span>
    </li>
  )
}
