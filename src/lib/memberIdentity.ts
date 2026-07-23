/**
 * Member identity re-mapping (PURE — no firebase, no I/O).
 *
 * When a phone signs in on a SECOND device, that device already has its own
 * locally-generated member id (e.g. `m-abc-1`) while the cloud already holds a
 * member document for the same phone under a DIFFERENT id (e.g. `m-xyz-0`).
 * Left alone, the family would see the same person twice.
 *
 * `remapMemberId` rewrites every reference to `fromId` into `toId` across the
 * whole local state so the device adopts the cloud's id for that phone.
 * Only used in cloud mode — local mode never calls it.
 */

import type { Member, Trip } from '../types'

export interface IdentityState {
  members: Member[]
  trips: Trip[]
  currentUserId: string | null
}

function swapInList(list: string[] | undefined, fromId: string, toId: string): string[] | undefined {
  if (!list) return list
  if (!list.includes(fromId)) return list
  const out: string[] = []
  for (const id of list) {
    const next = id === fromId ? toId : id
    if (!out.includes(next)) out.push(next)
  }
  return out
}

/**
 * Rewrite every reference to `fromId` as `toId`:
 * member ids, `currentUserId`, per-trip `members`, checklist item owners,
 * entry authors, photo uploaders, and both "who was there" people lists.
 *
 * If a member with `toId` already exists locally, the `fromId` member is merged
 * away (removed) rather than duplicated. Never mutates the input.
 */
export function remapMemberId(state: IdentityState, fromId: string, toId: string): IdentityState {
  if (!fromId || !toId || fromId === toId) return state

  const source = state.members.find((m) => m.id === fromId)
  const existing = state.members.find((m) => m.id === toId)

  let members: Member[]
  if (source && existing) {
    // Same human, two ids → keep one row, preferring the cloud's field values.
    members = state.members
      .filter((m) => m.id !== fromId)
      .map((m) => (m.id === toId ? { ...source, ...m, id: toId } : m))
  } else if (source) {
    members = state.members.map((m) => (m.id === fromId ? { ...m, id: toId } : m))
  } else {
    members = state.members
  }

  const trips: Trip[] = state.trips.map((t) => ({
    ...t,
    members: swapInList(t.members, fromId, toId) ?? t.members,
    checklist: t.checklist?.map((g) => ({
      ...g,
      items: g.items.map((it) => (it.owner === fromId ? { ...it, owner: toId } : it)),
    })),
    days: t.days.map((d) => ({
      ...d,
      entries: d.entries.map((e) => ({
        ...e,
        author: e.author === fromId ? toId : e.author,
        people: swapInList(e.people, fromId, toId),
      })),
      photos: d.photos.map((p) => ({
        ...p,
        by: p.by === fromId ? toId : p.by,
        people: swapInList(p.people, fromId, toId),
      })),
    })),
  }))

  const remapped = state.currentUserId === fromId ? toId : state.currentUserId

  // SAFETY NET (root cause of Galli's white screen): never leave `currentUserId`
  // pointing at a member that does not exist in `members`. That can happen when
  // this runs with a `fromId` whose member was already merged away by a prior
  // remap (a cloud-snapshot race) — the `else` branch above would then set
  // currentUserId to a `toId` for which no member row exists, and every screen's
  // `useCurrentMember()!` would crash. Fall back to a real member instead.
  const has = (id: string | null): boolean => !!id && members.some((m) => m.id === id)
  const currentUserId = has(remapped)
    ? remapped
    : has(state.currentUserId)
      ? state.currentUserId
      : (members[0]?.id ?? null)

  return { members, trips, currentUserId }
}
