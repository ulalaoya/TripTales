/**
 * Content-level trip merge (PURE — no firebase, no I/O, no store).
 *
 * WHY THIS REPLACES WHOLE-TRIP LAST-WRITE-WINS
 * --------------------------------------------
 * The old rule picked ONE side of a conflict and threw the other away. On
 * 2026-08-14 that cost a real week of planning: a device holding an older copy
 * pushed it, the copy arrived with a fresh `updatedAt`, and every day and
 * activity added on the other device was replaced. Two people editing the same
 * trip — the entire point of the app — was enough to trigger it.
 *
 * The rule here is different: CONTENT IS UNIONED, NEVER DROPPED. A day or an
 * activity that exists on either side exists in the result. An old copy can
 * add, it can never subtract.
 *
 * DELETES STILL WORK, via tombstones. Deleting records the id in `trip.deleted`
 * (id → when), tombstones are unioned like everything else, and any id carrying
 * one is removed from the merged result. So a delete propagates deliberately,
 * while the absence of an entity — which is all a stale copy really tells us —
 * never destroys anything.
 *
 * Where the two sides genuinely disagree about the SAME entity (both edited the
 * same activity's title), the trip with the newer `updatedAt` wins that field.
 * That is last-write-wins applied where it belongs: to one field of one record,
 * not to a week of work.
 */

import type { Activity, Day, Entry, Photo, Trip } from '../types'

/** id → when it was deleted (ms). Absent means "never deleted". */
export type Tombstones = Record<string, number>

/** Merge two tombstone maps, keeping the later deletion for a repeated id. */
export function mergeTombstones(a: Tombstones | undefined, b: Tombstones | undefined): Tombstones {
  const out: Tombstones = { ...(a ?? {}) }
  for (const [id, at] of Object.entries(b ?? {})) {
    if (!(id in out) || at > out[id]) out[id] = at
  }
  return out
}

interface HasId {
  id: string
}

/**
 * Union two lists by `id`, dropping anything tombstoned.
 *
 * `preferred` supplies the value whenever both sides carry the same id, and its
 * ordering is kept; ids only the other side has are appended in their own
 * order, so a concurrently-added activity lands at the end rather than
 * vanishing.
 */
export function unionById<T extends HasId>(
  preferred: readonly T[] | undefined,
  other: readonly T[] | undefined,
  tombstones: Tombstones = {},
  merge?: (preferred: T, other: T) => T,
): T[] {
  const alive = (x: T) => !(x.id in tombstones)
  const otherById = new Map((other ?? []).map((x) => [x.id, x]))
  const out: T[] = []
  const seen = new Set<string>()

  for (const x of preferred ?? []) {
    if (!alive(x)) continue
    seen.add(x.id)
    const twin = otherById.get(x.id)
    out.push(twin && merge ? merge(x, twin) : x)
  }
  for (const x of other ?? []) {
    if (!alive(x) || seen.has(x.id)) continue
    out.push(x)
  }
  return out
}

/**
 * Photos need one extra guarantee on top of the union: a local photo with no
 * `updatedAt` has never been confirmed by the server, so its absence from the
 * remote side means "not uploaded yet", never "deleted". `unionById` already
 * keeps it — this exists to make that requirement explicit and tested.
 */
function mergePhotos(preferred: Photo[] | undefined, other: Photo[] | undefined, tombstones: Tombstones): Photo[] {
  return unionById<Photo>(preferred, other, tombstones)
}

function mergeDay(preferred: Day, other: Day, tombstones: Tombstones): Day {
  return {
    ...preferred,
    activities: unionById<Activity>(preferred.activities, other.activities, tombstones),
    entries: unionById<Entry>(preferred.entries, other.entries, tombstones),
    photos: mergePhotos(preferred.photos, other.photos, tombstones),
  }
}

function union(a: string[] | undefined, b: string[] | undefined): string[] {
  const out = [...(a ?? [])]
  for (const x of b ?? []) if (!out.includes(x)) out.push(x)
  return out
}

/**
 * Merge the remote copy of a trip into the local one.
 *
 * Scalar fields (name, dates, transport, cover, checklist…) come from whichever
 * side has the newer `updatedAt`; a tie goes to the remote, which is the shared
 * truth. Days and their contents are unioned regardless, so neither side can
 * delete the other's work by simply not knowing about it.
 *
 * `order` is a per-device presentation choice and always stays local.
 */
export function mergeTripContent(local: Trip, remote: Trip): Trip {
  const tombstones = mergeTombstones(local.deleted, remote.deleted)
  const remoteWins = (remote.updatedAt ?? 0) >= (local.updatedAt ?? 0)
  const [preferred, other] = remoteWins ? [remote, local] : [local, remote]

  const days = unionById<Day>(preferred.days, other.days, tombstones, (p, o) => mergeDay(p, o, tombstones))
  days.sort((x, y) => String(x.date).localeCompare(String(y.date)))

  return {
    ...preferred,
    order: local.order,
    days,
    members: union(local.members, remote.members),
    memberUids: union(remote.memberUids, local.memberUids),
    deleted: Object.keys(tombstones).length > 0 ? tombstones : undefined,
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0) || undefined,
  }
}
