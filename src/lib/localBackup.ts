/**
 * Local snapshots of the persisted store, and export / import to a file.
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-08-14 a stale copy of a trip on one family member's device won a
 * last-write-wins merge and replaced a week of planning on another. Nothing had
 * ever been pushed to the cloud, so there was no server copy to fall back on,
 * and the only surviving trace was an untouched browser profile that had to be
 * carved out of Chrome's internal storage by hand.
 *
 * That must never be the recovery plan again. Two independent safety nets:
 *
 *   1. AUTOMATIC — `snapshotBeforeSync()` copies the persisted state aside on
 *      every app start, BEFORE cloud sync is allowed to touch anything. If a
 *      merge destroys something, the pre-merge state is still on the device.
 *   2. MANUAL — `exportStateFile()` / `importStateJson()` put a real file in
 *      the user's hands, independent of this app, this browser, and this
 *      device.
 *
 * Snapshots live in the same IndexedDB store as the persisted state, under
 * keys prefixed `triptales-backup:`. They are deliberately NOT synced.
 */

import { freezePersistence, idbStorage, rawSetItem } from './idbStorage'

/** The key Zustand's `persist` writes to — see `useStore.ts`. */
export const STORE_KEY = 'triptales-store'

const PREFIX = 'triptales-backup:'

/** How many automatic snapshots to keep. Older ones are pruned oldest-first. */
export const MAX_SNAPSHOTS = 10

export interface Snapshot {
  key: string
  /** Milliseconds; parsed from the key. */
  at: number
  /** Size of the stored JSON, in characters. */
  size: number
}

/** Shape check — enough to refuse an unrelated JSON file, not a full validation. */
export function looksLikeState(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as { state?: { trips?: unknown } }
    return !!parsed && typeof parsed === 'object' && Array.isArray(parsed.state?.trips)
  } catch {
    return false
  }
}

/** A short human summary of a state JSON: how many trips and photos it holds. */
export function describeState(text: string): { trips: number; days: number; activities: number; photos: number } | null {
  try {
    const parsed = JSON.parse(text) as {
      state?: { trips?: Array<{ days?: Array<{ activities?: unknown[]; photos?: unknown[] }> }> }
    }
    const trips = parsed.state?.trips ?? []
    let days = 0
    let activities = 0
    let photos = 0
    for (const trip of trips) {
      for (const day of trip.days ?? []) {
        days++
        activities += (day.activities ?? []).length
        photos += (day.photos ?? []).length
      }
    }
    return { trips: trips.length, days, activities, photos }
  } catch {
    return null
  }
}

/** Every snapshot on this device, newest first. */
export async function listSnapshots(): Promise<Snapshot[]> {
  const keys = (await idbStorage.keys()).filter((k) => k.startsWith(PREFIX))
  const out: Snapshot[] = []
  for (const key of keys) {
    const value = await idbStorage.getItem(key)
    if (value == null) continue
    const at = Number(key.slice(PREFIX.length))
    out.push({ key, at: Number.isFinite(at) ? at : 0, size: value.length })
  }
  return out.sort((a, b) => b.at - a.at)
}

/** Read one snapshot back. */
export function readSnapshot(key: string): Promise<string | null> {
  return idbStorage.getItem(key)
}

/**
 * Copy the persisted state aside, unless it is byte-identical to the newest
 * snapshot already held. Returns the key written, or null if nothing was.
 *
 * Never throws: a backup failure must not stop the app from starting.
 */
export async function snapshotBeforeSync(now: number = Date.now()): Promise<string | null> {
  try {
    const current = await idbStorage.getItem(STORE_KEY)
    if (current == null || current.length === 0) return null

    const existing = await listSnapshots()
    if (existing.length > 0) {
      const newest = await readSnapshot(existing[0].key)
      if (newest === current) return null
    }

    const key = `${PREFIX}${now}`
    await idbStorage.setItem(key, current)

    // Prune oldest-first, counting the one just written.
    const all = [...existing.map((s) => s.key), key]
    if (all.length > MAX_SNAPSHOTS) {
      const doomed = existing.slice(MAX_SNAPSHOTS - 1).map((s) => s.key)
      for (const k of doomed) await idbStorage.removeItem(k)
    }
    return key
  } catch {
    return null
  }
}

/** Filename for an exported backup, e.g. `triptales-2026-08-14-2203.json`. */
export function exportFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `triptales-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.json`
}

/**
 * Hand the current state to the user as a downloaded file. Resolves with the
 * filename, or null when there is nothing stored to export.
 */
export async function exportStateFile(): Promise<string | null> {
  const text = await idbStorage.getItem(STORE_KEY)
  if (text == null) return null

  const name = exportFileName()
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return name
}

/**
 * Replace the persisted state with `text`.
 *
 * The CURRENT state is snapshotted first, so an import is itself undoable —
 * restoring the wrong file must never be the end of the story.
 *
 * Persistence is then FROZEN before the write. Verified in a browser: without
 * it the restore silently did nothing, because the still-hydrated store wrote
 * its old copy back the moment anything touched it (the success toast was
 * enough). The caller must reload the page — there is no unfreeze.
 */
export async function importStateJson(text: string): Promise<boolean> {
  if (!looksLikeState(text)) return false
  await snapshotBeforeSync()
  freezePersistence()
  await rawSetItem(STORE_KEY, text)
  return true
}
