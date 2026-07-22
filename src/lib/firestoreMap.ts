/**
 * Trip <-> Firestore document mapping (PURE — no firebase import, no I/O).
 *
 * Firestore shape
 * ---------------
 *   trips/{tripId}                 → the trip WITHOUT photos (see `tripToDoc`)
 *   trips/{tripId}/photos/{photoId} → one document per photo (see `photosOfTrip`)
 *
 * Photos live in their own subcollection because a single base64 photo can
 * approach Firestore's 1 MB per-document limit; inlining them in the trip doc
 * would blow the limit after two or three moments.
 *
 * Round-trip guarantee
 * --------------------
 *   docToTrip(tripToDoc(t, []), photosOfTrip(t))  deep-equals  t
 *
 * This holds EXACTLY (not just "ignoring" the cloud-only fields): `tripToDoc`
 * turns `undefined` into `null` (Firestore rejects `undefined`) and `docToTrip`
 * drops `null`-valued keys again, and `docToTrip` strips `memberUids` back off
 * because that array is sync metadata rather than trip content — the sync layer
 * reads it off the raw document instead.
 */

import type { Day, Photo, Trip } from '../types'

type Bag = Record<string, unknown>

/** A photo document as stored under `trips/{tripId}/photos` — tagged with its day. */
export interface PhotoDoc {
  id: string
  dayId: string
  [k: string]: unknown
}

/** Deep copy, replacing every `undefined` with `null` (Firestore rejects `undefined`). */
function nullifyUndefined(value: unknown): unknown {
  if (value === undefined) return null
  if (Array.isArray(value)) return value.map(nullifyUndefined)
  if (value !== null && typeof value === 'object') {
    const out: Bag = {}
    for (const [k, v] of Object.entries(value as Bag)) out[k] = nullifyUndefined(v)
    return out
  }
  return value
}

/** Deep copy, dropping every key whose value is `null` — the inverse of the above. */
function dropNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dropNulls)
  if (value !== null && typeof value === 'object') {
    const out: Bag = {}
    for (const [k, v] of Object.entries(value as Bag)) {
      if (v === null) continue
      out[k] = dropNulls(v)
    }
    return out
  }
  return value
}

/**
 * Build the `trips/{id}` document for a trip.
 *
 * - Every `photos` array is stripped out of `days` (photos are their own docs).
 * - `memberUids` — the anonymous auth uids allowed to read/write this trip.
 * - Every `undefined` becomes `null`.
 * - The input trip is NEVER mutated.
 *
 * `id` is duplicated inside the document (it is also the document id) so that
 * `docToTrip` can rebuild a complete `Trip` from the document alone.
 */
export function tripToDoc(trip: Trip, memberUids: string[]): object {
  const days = (trip.days ?? []).map((d) => ({
    id: d.id,
    date: d.date,
    title: d.title,
    activities: d.activities ?? [],
    entries: d.entries ?? [],
  }))

  const doc = {
    ...trip,
    days,
    memberUids: [...(memberUids ?? [])],
    updatedAt: trip.updatedAt ?? null,
  }

  return nullifyUndefined(doc) as object
}

/**
 * Flatten every photo across every day into one flat list, each tagged with the
 * `dayId` it belongs to. `undefined` fields become `null`, as in `tripToDoc`.
 * The input trip is NEVER mutated.
 */
export function photosOfTrip(trip: Trip): PhotoDoc[] {
  const out: PhotoDoc[] = []
  for (const day of trip.days ?? []) {
    for (const photo of day.photos ?? []) {
      out.push(nullifyUndefined({ ...photo, dayId: day.id }) as PhotoDoc)
    }
  }
  return out
}

/**
 * Rebuild a `Trip` from its document plus the flat photo list.
 *
 * - Each photo is re-nested into its day by `dayId` (order preserved).
 * - Photos whose `dayId` no longer exists on the trip are DROPPED.
 * - Days with no photos get `photos: []` restored.
 * - `null` values (the wire form of `undefined`) are dropped again.
 * - `memberUids` is stripped — it is sync metadata, not trip content.
 */
export function docToTrip(doc: object, photos: Array<{ id: string; dayId: string }>): Trip {
  const clean = dropNulls(doc ?? {}) as Bag & { days?: unknown[] }

  const byDay = new Map<string, Photo[]>()
  for (const raw of photos ?? []) {
    if (!raw || typeof raw !== 'object') continue
    const { dayId, ...rest } = dropNulls(raw) as Bag & { dayId?: string }
    if (typeof dayId !== 'string' || dayId === '') continue
    const list = byDay.get(dayId)
    if (list) list.push(rest as unknown as Photo)
    else byDay.set(dayId, [rest as unknown as Photo])
  }

  const days: Day[] = ((clean.days ?? []) as Bag[]).map((d) => ({
    ...(d as unknown as Day),
    activities: (d.activities ?? []) as Day['activities'],
    entries: (d.entries ?? []) as Day['entries'],
    photos: byDay.get(String(d.id)) ?? [],
  }))

  const trip = { ...clean, days } as unknown as Trip & { memberUids?: string[] }
  delete trip.memberUids
  return trip as Trip
}

/** Read `memberUids` off a raw trip document (sync metadata `docToTrip` strips). */
export function memberUidsOfDoc(doc: object): string[] {
  const v = (doc as Bag | undefined)?.memberUids
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}
