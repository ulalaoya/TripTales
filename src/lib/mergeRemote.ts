/**
 * Last-write-wins conflict resolution (PURE — no firebase, no I/O).
 *
 * Both the local (Zustand/localStorage) copy and the remote (Firestore) copy of
 * a record carry an `updatedAt` millisecond stamp. When a snapshot arrives we
 * keep whichever side is newer.
 */

/**
 * Return whichever of `local` / `remote` is newer by `updatedAt`.
 *
 * Rules, in order:
 * 1. If exactly one side is `undefined`, the other side wins.
 * 2. If both sides are `undefined`, the result is `undefined`.
 * 3. A side with no (or a non-numeric) `updatedAt` LOSES to a side that has one.
 * 4. If neither side has an `updatedAt`, `remote` wins — the server is the
 *    shared truth, so an unstamped local copy never suppresses a shared one.
 * 5. On an exact tie, `remote` wins, for the same reason as rule 4.
 */
export function pickNewer<T extends { updatedAt?: number }>(
  local: T | undefined,
  remote: T | undefined,
): T | undefined {
  if (local === undefined && remote === undefined) return undefined
  if (local === undefined) return remote
  if (remote === undefined) return local

  const l = typeof local.updatedAt === 'number' && Number.isFinite(local.updatedAt) ? local.updatedAt : null
  const r = typeof remote.updatedAt === 'number' && Number.isFinite(remote.updatedAt) ? remote.updatedAt : null

  if (l === null && r === null) return remote
  if (l === null) return remote
  if (r === null) return local
  return l > r ? local : remote
}

/** Minimal shapes needed to merge photos back into a winning remote trip. */
interface PhotoLike {
  id: string
  updatedAt?: number
}
interface DayLike<P extends PhotoLike> {
  id: string
  photos: P[]
}
interface TripLike<P extends PhotoLike, D extends DayLike<P>> {
  days: D[]
}

/**
 * Re-attach local photos that the winning REMOTE copy does not carry.
 *
 * WHY THIS EXISTS — it prevents real, permanent photo loss. A trip document and
 * its photos live in two different Firestore places (the doc, and a `photos`
 * subcollection), so a trip update can arrive while the photo snapshot is still
 * in flight. Replacing the local trip wholesale at that moment deletes photos
 * that only existed on this device; the next push then deletes them from the
 * cloud too, and they are gone everywhere.
 *
 * The rule: a local photo with NO `updatedAt` has never been confirmed by the
 * server, so its absence from the remote copy means "not uploaded yet", never
 * "deleted" — keep it. A photo that HAS been stamped by the server may legally
 * disappear (someone deleted it), so those are allowed through.
 */
export function preserveUnsyncedPhotos<P extends PhotoLike, D extends DayLike<P>, T extends TripLike<P, D>>(
  local: T,
  remote: T,
): T {
  const localDays = new Map(local.days.map((d) => [d.id, d]))
  let changed = false

  const days = remote.days.map((day) => {
    const mine = localDays.get(day.id)
    if (!mine) return day
    const remoteIds = new Set(day.photos.map((p) => p.id))
    const unsynced = mine.photos.filter((p) => p.updatedAt === undefined && !remoteIds.has(p.id))
    if (unsynced.length === 0) return day
    changed = true
    return { ...day, photos: [...day.photos, ...unsynced] }
  })

  return changed ? { ...remote, days } : remote
}
