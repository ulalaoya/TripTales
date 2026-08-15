import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n/useT'
import { Icon } from './Icon'
import {
  describeState,
  exportStateFile,
  importStateJson,
  listSnapshots,
  readSnapshot,
  type Snapshot,
} from '../lib/localBackup'

/**
 * Backup and restore, as a collapsed panel in trip settings.
 *
 * Deliberately app-wide rather than per-trip: it saves and restores EVERYTHING
 * on the device, because the failure it guards against (a stale copy winning a
 * merge and replacing local content) is not confined to one trip.
 *
 * Restoring reloads the page on purpose — the store is already hydrated in
 * memory and would otherwise write itself straight back over the restored data.
 */
export function BackupPanel() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const showToast = useStore((s) => s.showToast)

  useEffect(() => {
    if (!open) return
    let alive = true
    void listSnapshots().then((s) => {
      if (alive) setSnapshots(s)
    })
    return () => {
      alive = false
    }
  }, [open])

  async function onExport() {
    const name = await exportStateFile()
    showToast(name ? t('backupDone') : t('backupNothing'))
  }

  async function restore(text: string) {
    if (!window.confirm(t('backupConfirm'))) return
    const ok = await importStateJson(text)
    if (!ok) {
      showToast(t('backupBadFile'))
      return
    }
    showToast(t('backupRestored'))
    window.location.reload()
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return
    await restore(await file.text())
  }

  async function onRestoreSnapshot(key: string) {
    const text = await readSnapshot(key)
    if (text == null) {
      showToast(t('backupBadFile'))
      return
    }
    await restore(text)
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
          <Icon name="check" size={18} />
          {t('backupTitle')}
        </span>
        <Icon name="chevron" size={16} style={{ transform: `rotate(${open ? -90 : 90}deg)` }} />
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded-[14px] border border-[var(--line)] bg-white p-3">
          <p className="text-xs text-[var(--muted)]">{t('backupExplain')}</p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExport}
              className="tap px-3 py-2 rounded-[14px] border border-[var(--line)] text-sm inline-flex items-center gap-1"
            >
              <Icon name="share" size={16} />
              {t('backupExport')}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="tap px-3 py-2 rounded-[14px] border border-[var(--line)] text-sm inline-flex items-center gap-1"
            >
              <Icon name="cloud" size={16} />
              {t('backupImport')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void onPickFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>

          <div>
            <p className="text-xs font-bold mb-1">{t('backupAuto')}</p>
            {snapshots.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">{t('backupAutoEmpty')}</p>
            ) : (
              <ul className="space-y-1">
                {snapshots.map((s) => (
                  <SnapshotRow key={s.key} snapshot={s} onRestore={() => onRestoreSnapshot(s.key)} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** One automatic snapshot: when it was taken, and what it contains. */
function SnapshotRow({ snapshot, onRestore }: { snapshot: Snapshot; onRestore: () => void }) {
  const t = useT()
  const [summary, setSummary] = useState<string>('')

  useEffect(() => {
    let alive = true
    void readSnapshot(snapshot.key).then((text) => {
      if (!alive || text == null) return
      const d = describeState(text)
      if (!d) return
      setSummary(
        t('backupSummary')
          .replace('{trips}', String(d.trips))
          .replace('{activities}', String(d.activities))
          .replace('{photos}', String(d.photos)),
      )
    })
    return () => {
      alive = false
    }
  }, [snapshot.key, t])

  return (
    <li className="flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0">
        <bdi className="block truncate">{new Date(snapshot.at).toLocaleString()}</bdi>
        {summary ? <span className="text-[var(--muted)]">{summary}</span> : null}
      </span>
      <button
        type="button"
        onClick={onRestore}
        className="tap shrink-0 px-2 py-1 rounded-[10px] border border-[var(--line)]"
      >
        {t('backupRestoreThis')}
      </button>
    </li>
  )
}
