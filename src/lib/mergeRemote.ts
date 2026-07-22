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
