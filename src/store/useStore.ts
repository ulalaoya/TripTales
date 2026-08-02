import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '../lib/idbStorage'
import type {
  Member,
  Trip,
  Day,
  Entry,
  Photo,
  Activity,
  Role,
  Figure,
  ChecklistGroup,
  ChecklistItem,
  Reacts,
} from '../types'
import { SEED_MEMBERS, SEED_TRIPS, makeDefaultChecklist, makeDriveTrip } from '../data/seed'
import { normalizePhone } from '../lib/phone'
import { toggleReact, isAllowedEmoji } from '../lib/reactions'
import { uploadStatusFor } from '../lib/permissions'
import { canEditChecklist } from '../lib/checklist'
import { canAddChecklistItem } from '../lib/checklistPerms'
import { isCloudEnabled } from '../lib/firebase'
import { generateJoinCode } from '../lib/joinCode'
import { canJoinWithCode } from '../lib/tripPermissions'
import { reorderActivities, moveActivityToDay } from '../lib/activities'
import { buildDays } from '../lib/days'
import { pickNewer, preserveUnsyncedPhotos } from '../lib/mergeRemote'
import { remapMemberId } from '../lib/memberIdentity'
import type { SyncState } from '../lib/syncState'
import type { Lang } from '../i18n'

export type LoginResult =
  | { kind: 'known'; member: Member }
  | { kind: 'unknown'; phone: string }

export type JoinResult =
  | { ok: true; tripId: string }
  | { ok: false; reason: 'notfound' | 'already' }

/**
 * A member document as it comes back from Firestore.
 *
 * `phone` and `email` are structurally ABSENT — they are never uploaded (see
 * `lib/phoneHash` and `claimMemberDoc`), so they can never arrive from the
 * cloud and can never overwrite the local copies. The type enforces that.
 */
export type RemoteMember = { id: string } & Partial<Omit<Member, 'id' | 'phone' | 'email'>>

/** App colour scheme. Persisted, and applied as `<html data-theme>`. */
export type Theme = 'light' | 'dark'

interface State {
  lang: Lang
  theme: Theme
  /**
   * The app-wide colour palette (see `lib/palettes`). Chosen from any trip's
   * Settings but applied everywhere — trips, home and the login screens
   * (Galli feedback: one palette for the whole app, not one per trip).
   */
  paletteId: string
  members: Member[]
  trips: Trip[]
  currentUserId: string | null
  toast: string | null

  /**
   * The day the user last looked at inside each trip's planner, keyed by trip id.
   * NEVER persisted (excluded from `partialize`) — it is a within-session UI hint
   * so the ➕ "new moment" composer can default to the day you are standing on
   * (Galli feedback — Item 1) instead of always the trip's last day.
   */
  activeDay: Record<string, string>

  // ----- Cloud sync (NEVER persisted; always inert in local mode) -----
  /** Firebase Anonymous Auth uid, once signed in. `null` in local mode. */
  cloudUid: string | null
  /** Indicator state. Stays `'off'` for the whole session in local mode. */
  syncState: SyncState
  /** True once the async (IndexedDB) persisted state has finished rehydrating. */
  hasHydrated: boolean
  setHydrated: () => void

  setLang: (lang: Lang) => void
  /** Flip between day and night mode. */
  toggleTheme: () => void
  /** Choose the app-wide colour palette. */
  setPaletteId: (paletteId: string) => void
  /**
   * Trips this DEVICE deliberately removed. Deleting a trip means "leave it",
   * and the member's cloud trip index is shared with the person's other devices
   * — which kept re-listing it and restoring the trip straight back. Remembering
   * what was left keeps it gone here without deleting it for the family.
   */
  leftTripIds: string[]
  showToast: (msg: string) => void
  clearToast: () => void
  /** Remember which day of a trip the planner is currently showing. */
  setActiveDay: (tripId: string, dayId: string) => void

  login: (rawPhone: string) => LoginResult
  /**
   * Sign in as an identity recovered from the cloud by phone number (a NEW
   * DEVICE for an existing person), so the newcomer name/avatar screen is
   * skipped entirely. See `lib/cloud.cloudFindMemberByPhone`.
   */
  adoptRemoteIdentity: (
    identity: Pick<Member, 'id' | 'name' | 'role' | 'figure' | 'color'>,
    phone: string,
  ) => void
  registerMember: (m: Omit<Member, 'id'>) => Member
  /** Create a member WITHOUT logging them in (used by the trip wizard). */
  addMember: (m: Omit<Member, 'id'>) => Member
  updateProfile: (patch: Partial<Pick<Member, 'name' | 'figure' | 'color' | 'role' | 'email'>>) => void
  /** Parent-only: change another member's role (R2 profile.editRole). */
  setMemberRole: (memberId: string, role: Role) => void
  /**
   * Parent-only: edit any member's editable fields (name / figure / colour /
   * role) — powers the editable participant rows in the wizard and on
   * /trips/:tripId/people.
   */
  updateMember: (
    memberId: string,
    patch: Partial<Pick<Member, 'name' | 'figure' | 'color' | 'role'>>,
  ) => void
  logout: () => void

  addTrip: (
    t: Omit<Trip, 'id' | 'order' | 'days' | 'joinCode'> & {
      days?: Trip['days']
      members?: string[]
      joinCode?: string
    },
  ) => Trip
  updateTrip: (id: string, patch: Partial<Trip>) => void
  /** Change a trip's date range, rebuilding its day list (content preserved by date). */
  updateTripDates: (id: string, startDate: string, endDate: string) => void
  deleteTrip: (id: string) => void
  reorderTrip: (id: string, dir: -1 | 1) => void

  // ----- Trip membership -----
  addTripMember: (tripId: string, memberId: string) => void
  removeTripMember: (tripId: string, memberId: string) => void
  /** Join the trip whose join code matches `rawCode`, adding the current user. */
  joinTripByCode: (rawCode: string) => JoinResult

  /** Rename a day (the day's NAME, shown as the heading inside the day view). */
  updateDayTitle: (tripId: string, dayId: string, title: string) => void

  // ----- Day activities -----
  addActivity: (tripId: string, dayId: string, activity: Omit<Activity, 'id'>) => void
  updateActivity: (tripId: string, dayId: string, activityId: string, patch: Partial<Omit<Activity, 'id'>>) => void
  deleteActivity: (tripId: string, dayId: string, activityId: string) => void
  reorderActivity: (tripId: string, dayId: string, fromIndex: number, toIndex: number) => void
  moveActivity: (tripId: string, fromDayId: string, toDayId: string, activityId: string, toIndex: number) => void

  addEntry: (tripId: string, dayId: string, entry: Omit<Entry, 'id' | 'reacts' | 'ts'>) => void
  deleteEntry: (tripId: string, dayId: string, entryId: string) => void

  addPhoto: (
    tripId: string,
    dayId: string,
    photo: Omit<Photo, 'id' | 'reacts' | 'status' | 'fav'>,
    uploaderRole: Role,
  ) => Photo['status']
  approvePhoto: (tripId: string, dayId: string, photoId: string) => void
  rejectPhoto: (tripId: string, dayId: string, photoId: string) => void
  /** Remove a photo (any status) — used by the album/planner delete control. */
  deletePhoto: (tripId: string, dayId: string, photoId: string) => void
  toggleFav: (tripId: string, dayId: string, photoId: string) => void

  reactEntry: (tripId: string, dayId: string, entryId: string, emoji: string, memberId: string) => void
  reactPhoto: (tripId: string, dayId: string, photoId: string, emoji: string, memberId: string) => void

  // ----- Equipment checklist -----
  toggleChecklistItem: (tripId: string, groupId: string, itemId: string) => void
  addChecklistItem: (tripId: string, groupId: string, item: { label: string; owner: string }) => void
  deleteChecklistItem: (tripId: string, groupId: string, itemId: string) => void
  addChecklistGroup: (tripId: string, group: { name: string; emoji: string }) => void
  deleteChecklistGroup: (tripId: string, groupId: string) => void

  // ----- Cloud sync plumbing (only ever called by `lib/cloud.ts`) -----
  setSyncState: (state: SyncState) => void
  setCloudUid: (uid: string | null) => void
  /** Stamp the local uid onto a member (the anonymous principal that claimed it). */
  setMemberUid: (memberId: string, uid: string) => void
  /** Adopt the cloud's member id for this phone across the whole local state. */
  adoptMemberId: (fromId: string, toId: string) => void
  /** Upsert member documents that arrived from Firestore (never phone/email). */
  applyRemoteMembers: (incoming: RemoteMember[]) => void
  /** Merge one trip that arrived from Firestore (last-write-wins on updatedAt). */
  /**
   * Merge one trip that arrived from Firestore.
   * `force` means "this device has no unpushed changes", so the cloud copy is
   * adopted without consulting the (client-clock based) `updatedAt` stamps.
   */
  applyRemoteTrip: (trip: Trip, force?: boolean) => void
  /** Record the cloud bookkeeping fields after a successful push. */
  markTripPushed: (tripId: string, updatedAt: number, memberUids: string[]) => void
}

let idc = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(idc++).toString(36)}`

/**
 * The seed/demo trips a fresh install ships with. On login the current user is
 * made a member of these (Galli feedback root-cause A) so whoever uses the app
 * owns their own demo/Galilee trips — can fully edit them and appears in the
 * participants list. We never auto-join trips the user merely joined by code
 * that belong to others (those carry different ids).
 */
const SEED_TRIP_IDS = ['t-flight', 't-drive']

/**
 * Cloud last-write-wins stamp bump after a LOCAL edit. In local mode (no
 * Firebase) this is a no-op, so persisted local data stays byte-for-byte
 * identical; in cloud mode it stamps `updatedAt = Date.now()` so a fresh local
 * edit always wins over a stale echoed snapshot (Galli feedback root-cause B —
 * day titles were being clobbered before the debounced push fired).
 */
function touch(trip: Trip): Trip {
  return isCloudEnabled ? { ...trip, updatedAt: Date.now() } : trip
}

/** Add the current user to any seed trip they are not yet a member of. */
function withSelfInSeedTrips(trips: Trip[], memberId: string): Trip[] {
  return trips.map((t) =>
    SEED_TRIP_IDS.includes(t.id) && !t.members.includes(memberId)
      ? touch({ ...t, members: [...t.members, memberId] })
      : t,
  )
}

/** Map one trip in state, immutably. */
function mapTrip(trips: Trip[], tripId: string, fn: (t: Trip) => Trip): Trip[] {
  return trips.map((t) => (t.id === tripId ? fn(t) : t))
}

/** Like `mapTrip`, but also bumps the cloud LWW stamp on the edited trip. */
function editTrip(trips: Trip[], tripId: string, fn: (t: Trip) => Trip): Trip[] {
  return trips.map((t) => (t.id === tripId ? touch(fn(t)) : t))
}

function mapDays(trip: Trip, dayId: string, fn: (d: Day) => Day): Trip {
  return { ...trip, days: trip.days.map((d) => (d.id === dayId ? fn(d) : d)) }
}

/** Map one group inside a trip's checklist. */
function mapGroup(trip: Trip, groupId: string, fn: (g: ChecklistGroup) => ChecklistGroup): Trip {
  return { ...trip, checklist: (trip.checklist ?? []).map((g) => (g.id === groupId ? fn(g) : g)) }
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      lang: 'he',
      theme: 'light',
      paletteId: 'coral',
      leftTripIds: [],
      members: SEED_MEMBERS,
      trips: SEED_TRIPS,
      currentUserId: null,
      toast: null,
      activeDay: {},
      cloudUid: null,
      syncState: 'off',
      hasHydrated: false,
      setHydrated: () => set({ hasHydrated: true }),

      setLang: (lang) => set({ lang }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setPaletteId: (paletteId) => set({ paletteId }),
      showToast: (msg) => set({ toast: msg }),
      clearToast: () => set({ toast: null }),
      setActiveDay: (tripId, dayId) =>
        set((s) => (s.activeDay[tripId] === dayId ? {} : { activeDay: { ...s.activeDay, [tripId]: dayId } })),

      login: (rawPhone) => {
        const phone = normalizePhone(rawPhone)
        const member = get().members.find((m) => m.phone === phone)
        if (member) {
          set((s) => ({ currentUserId: member.id, trips: withSelfInSeedTrips(s.trips, member.id) }))
          return { kind: 'known', member }
        }
        return { kind: 'unknown', phone }
      },

      adoptRemoteIdentity: (identity, rawPhone) =>
        set((s) => {
          const phone = normalizePhone(rawPhone)
          const existing = s.members.find((m) => m.id === identity.id)
          // The phone stays device-local (it is never in the cloud document).
          const member: Member = existing ? { ...existing, ...identity, phone } : { ...identity, phone }
          return {
            members: existing
              ? s.members.map((m) => (m.id === identity.id ? member : m))
              : [...s.members, member],
            currentUserId: identity.id,
            trips: withSelfInSeedTrips(s.trips, identity.id),
          }
        }),

      registerMember: (m) => {
        const member: Member = { ...m, id: uid('m') }
        set((s) => ({
          members: [...s.members, member],
          currentUserId: member.id,
          trips: withSelfInSeedTrips(s.trips, member.id),
        }))
        return member
      },

      addMember: (m) => {
        const member: Member = { ...m, id: uid('m') }
        set((s) => ({ members: [...s.members, member] }))
        return member
      },

      updateProfile: (patch) =>
        set((s) => ({
          members: s.members.map((m) => (m.id === s.currentUserId ? { ...m, ...patch } : m)),
        })),

      setMemberRole: (memberId, role) =>
        set((s) => {
          const me = s.members.find((m) => m.id === s.currentUserId)
          if (!me || me.role !== 'מבוגר') return {} // parent-only guard
          return { members: s.members.map((m) => (m.id === memberId ? { ...m, role } : m)) }
        }),

      updateMember: (memberId, patch) =>
        set((s) => {
          const me = s.members.find((m) => m.id === s.currentUserId)
          if (!me || me.role !== 'מבוגר') return {} // parent-only guard
          return { members: s.members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)) }
        }),

      logout: () => set({ currentUserId: null }),

      addTrip: (t) => {
        const order = get().trips.reduce((mx, x) => Math.max(mx, x.order), -1) + 1
        const id = uid('t')
        const me = get().currentUserId
        const members = t.members ?? (me ? [me] : [])
        const trip: Trip = {
          id,
          order,
          days: t.days ?? [],
          ...t,
          members,
          joinCode: t.joinCode ?? generateJoinCode(),
          checklist: t.checklist ?? makeDefaultChecklist(id),
        }
        set((s) => ({ trips: [...s.trips, trip] }))
        return trip
      },

      updateTrip: (id, patch) => set((s) => ({ trips: editTrip(s.trips, id, (t) => ({ ...t, ...patch })) })),

      updateTripDates: (id, startDate, endDate) =>
        set((s) => ({
          trips: editTrip(s.trips, id, (t) => ({
            ...t,
            startDate,
            endDate,
            days: buildDays(startDate, endDate, t.days),
          })),
        })),

      deleteTrip: (id) =>
        set((s) => ({
          trips: s.trips.filter((t) => t.id !== id),
          // Remember it, so the cross-device restore never brings it back here.
          leftTripIds: s.leftTripIds.includes(id) ? s.leftTripIds : [...s.leftTripIds, id],
        })),

      reorderTrip: (id, dir) =>
        set((s) => {
          const sorted = [...s.trips].sort((a, b) => a.order - b.order)
          const i = sorted.findIndex((t) => t.id === id)
          const j = i + dir
          if (i < 0 || j < 0 || j >= sorted.length) return {}
          const a = sorted[i].order
          sorted[i].order = sorted[j].order
          sorted[j].order = a
          return { trips: [...sorted] }
        }),

      // ----- Trip membership -----
      addTripMember: (tripId, memberId) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            t.members.includes(memberId) ? t : { ...t, members: [...t.members, memberId] },
          ),
        })),

      removeTripMember: (tripId, memberId) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) => ({
            ...t,
            members: t.members.filter((id) => id !== memberId),
          })),
        })),

      joinTripByCode: (rawCode) => {
        const s = get()
        const me = s.currentUserId
        if (!me) return { ok: false, reason: 'notfound' }
        const trip = s.trips.find((t) => canJoinWithCode(t, rawCode))
        if (!trip) return { ok: false, reason: 'notfound' }
        if (trip.members.includes(me)) return { ok: false, reason: 'already' }
        set((st) => ({
          trips: editTrip(st.trips, trip.id, (t) => ({ ...t, members: [...t.members, me] })),
          // Joining on purpose undoes an earlier "leave" on this device.
          leftTripIds: st.leftTripIds.filter((id) => id !== trip.id),
        }))
        return { ok: true, tripId: trip.id }
      },

      updateDayTitle: (tripId, dayId, title) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) => mapDays(t, dayId, (d) => ({ ...d, title }))),
        })),

      // ----- Day activities -----
      addActivity: (tripId, dayId, activity) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({ ...d, activities: [...d.activities, { ...activity, id: uid('a') }] })),
          ),
        })),

      updateActivity: (tripId, dayId, activityId, patch) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({
              ...d,
              activities: d.activities.map((a) => (a.id === activityId ? { ...a, ...patch } : a)),
            })),
          ),
        })),

      deleteActivity: (tripId, dayId, activityId) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({ ...d, activities: d.activities.filter((a) => a.id !== activityId) })),
          ),
        })),

      reorderActivity: (tripId, dayId, fromIndex, toIndex) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({ ...d, activities: reorderActivities(d.activities, fromIndex, toIndex) })),
          ),
        })),

      moveActivity: (tripId, fromDayId, toDayId, activityId, toIndex) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) => ({
            ...t,
            days: moveActivityToDay(t.days, fromDayId, toDayId, activityId, toIndex),
          })),
        })),

      addEntry: (tripId, dayId, entry) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({
              ...d,
              entries: [...d.entries, { ...entry, id: uid('e'), ts: Date.now(), reacts: {} }],
            })),
          ),
        })),

      deleteEntry: (tripId, dayId, entryId) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({ ...d, entries: d.entries.filter((e) => e.id !== entryId) })),
          ),
        })),

      addPhoto: (tripId, dayId, photo, uploaderRole) => {
        const status = uploadStatusFor(uploaderRole)
        // The mood chosen in the composer IS the uploader's reaction, so the
        // photo arrives in the album already carrying it (Galli feedback — the
        // mood used to be stored and then never surfaced anywhere).
        const reacts: Reacts = photo.mood && isAllowedEmoji(photo.mood) ? { [photo.mood]: [photo.by] } : {}
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({
              ...d,
              photos: [...d.photos, { ...photo, id: uid('p'), status, fav: false, reacts }],
            })),
          ),
        }))
        return status
      },

      approvePhoto: (tripId, dayId, photoId) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({
              ...d,
              photos: d.photos.map((p) => (p.id === photoId ? { ...p, status: 'approved' } : p)),
            })),
          ),
        })),

      rejectPhoto: (tripId, dayId, photoId) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({ ...d, photos: d.photos.filter((p) => p.id !== photoId) })),
          ),
        })),

      deletePhoto: (tripId, dayId, photoId) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({ ...d, photos: d.photos.filter((p) => p.id !== photoId) })),
          ),
        })),

      toggleFav: (tripId, dayId, photoId) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({
              ...d,
              photos: d.photos.map((p) =>
                p.id === photoId && p.status === 'approved' ? { ...p, fav: !p.fav } : p,
              ),
            })),
          ),
        })),

      reactEntry: (tripId, dayId, entryId, emoji, memberId) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({
              ...d,
              entries: d.entries.map((e) =>
                e.id === entryId ? { ...e, reacts: toggleReact(e.reacts, emoji, memberId) } : e,
              ),
            })),
          ),
        })),

      reactPhoto: (tripId, dayId, photoId, emoji, memberId) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({
              ...d,
              photos: d.photos.map((p) =>
                p.id === photoId && p.status === 'approved'
                  ? { ...p, reacts: toggleReact(p.reacts, emoji, memberId) }
                  : p,
              ),
            })),
          ),
        })),

      // ----- Equipment checklist -----
      toggleChecklistItem: (tripId, groupId, itemId) =>
        set((s) => ({
          trips: editTrip(s.trips, tripId, (t) =>
            mapGroup(t, groupId, (g) => ({
              ...g,
              items: g.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
            })),
          ),
        })),

      addChecklistItem: (tripId, groupId, item) =>
        set((s) => {
          const me = s.members.find((m) => m.id === s.currentUserId)
          // Adding an item is open to EVERY member — adults and children alike
          // (Galli feedback #16). Only structural edits below stay parent-only.
          if (!me || !canAddChecklistItem(me.role)) return {}
          const newItem: ChecklistItem = { id: uid('ci'), label: item.label, owner: item.owner, done: false }
          return {
            trips: editTrip(s.trips, tripId, (t) => mapGroup(t, groupId, (g) => ({ ...g, items: [...g.items, newItem] }))),
          }
        }),

      deleteChecklistItem: (tripId, groupId, itemId) =>
        set((s) => {
          const me = s.members.find((m) => m.id === s.currentUserId)
          if (!me || !canEditChecklist(me.role)) return {} // parent-only guard
          return {
            trips: editTrip(s.trips, tripId, (t) =>
              mapGroup(t, groupId, (g) => ({ ...g, items: g.items.filter((it) => it.id !== itemId) })),
            ),
          }
        }),

      addChecklistGroup: (tripId, group) =>
        set((s) => {
          const me = s.members.find((m) => m.id === s.currentUserId)
          if (!me || !canEditChecklist(me.role)) return {} // parent-only guard
          const newGroup: ChecklistGroup = { id: uid('cg'), name: group.name, emoji: group.emoji, items: [] }
          return {
            trips: editTrip(s.trips, tripId, (t) => ({ ...t, checklist: [...(t.checklist ?? []), newGroup] })),
          }
        }),

      deleteChecklistGroup: (tripId, groupId) =>
        set((s) => {
          const me = s.members.find((m) => m.id === s.currentUserId)
          if (!me || !canEditChecklist(me.role)) return {} // parent-only guard
          return {
            trips: editTrip(s.trips, tripId, (t) => ({
              ...t,
              checklist: (t.checklist ?? []).filter((g) => g.id !== groupId),
            })),
          }
        }),

      // ----- Cloud sync plumbing -----
      // None of these are reachable in local mode: `lib/cloud.ts` is the only
      // caller and every entry point there returns early when cloud is off.

      setSyncState: (state) => set({ syncState: state }),

      setCloudUid: (uid) => set({ cloudUid: uid }),

      setMemberUid: (memberId, uid) =>
        set((s) => ({
          members: s.members.map((m) => (m.id === memberId ? { ...m, uid } : m)),
        })),

      adoptMemberId: (fromId, toId) =>
        set((s) => remapMemberId({ members: s.members, trips: s.trips, currentUserId: s.currentUserId }, fromId, toId)),

      applyRemoteMembers: (incoming) =>
        set((s) => {
          if (incoming.length === 0) return {}
          const byId = new Map(s.members.map((m) => [m.id, m]))
          for (const remote of incoming) {
            if (!remote?.id) continue
            const local = byId.get(remote.id)
            // Never let a remote doc clobber the signed-in user's own profile —
            // that person edits it here and pushes it, not the other way round.
            if (local && local.id === s.currentUserId) continue
            if (local) {
              // `remote` structurally cannot carry phone/email, so the local
              // (device-only) values for those survive this merge untouched.
              byId.set(remote.id, { ...local, ...remote })
            } else {
              // Someone else's member, first sighting. We do NOT know their
              // phone and must never guess one — it stays empty on this device.
              byId.set(remote.id, {
                phone: '',
                name: '',
                role: 'ילד',
                figure: 'person',
                color: 'linear-gradient(145deg,#42b8d4,#67d3bd)',
                ...remote,
              })
            }
          }
          return { members: [...byId.values()] }
        }),

      applyRemoteTrip: (trip, force) =>
        set((s) => {
          if (!trip?.id) return {}
          const local = s.trips.find((t) => t.id === trip.id)
          if (!local) {
            const order = s.trips.reduce((mx, x) => Math.max(mx, x.order), -1) + 1
            return { trips: [...s.trips, { ...trip, order: trip.order ?? order }] }
          }
          // Nothing local to protect → the cloud wins, whatever the clocks say.
          const winner = force ? trip : pickNewer(local, trip)
          if (!winner || winner === local) {
            // Local content wins, but always absorb the cloud's membership set.
            return { trips: mapTrip(s.trips, trip.id, (t) => ({ ...t, memberUids: trip.memberUids ?? t.memberUids })) }
          }
          // Keep the local ordering — `order` is a per-device presentation choice.
          // `preserveUnsyncedPhotos` guarantees that adopting the remote copy can
          // never drop photos this device has not uploaded yet (they would then
          // be deleted from the cloud on the next push, i.e. lost for good).
          const merged = preserveUnsyncedPhotos(local, trip)
          return { trips: mapTrip(s.trips, trip.id, () => ({ ...merged, order: local.order })) }
        }),

      markTripPushed: (tripId, updatedAt, memberUids) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) => ({ ...t, updatedAt, memberUids })),
        })),
    }),
    {
      name: 'triptales-store',
      version: 7,
      // IndexedDB, not localStorage: photos (base64) blow localStorage's ~5 MB
      // quota, and its synchronous `setItem` threw QuotaExceededError mid-render.
      // `idbStorage` also migrates any existing localStorage data on first read.
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
      partialize: (s) => ({
        lang: s.lang,
        theme: s.theme,
        paletteId: s.paletteId,
        leftTripIds: s.leftTripIds,
        members: s.members,
        trips: s.trips,
        currentUserId: s.currentUserId,
      }),
      /**
       * v1 -> v2: back-fill a default equipment checklist onto legacy trips.
       * v2 -> v3: back-fill per-trip `members` (all current members) + `joinCode`,
       *           and give every day an empty `activities` array.
       * v3 -> v4: replace the old demo weekend trip with the real Galilee trip —
       *           but ONLY if the user never renamed it, so real edits are never lost.
       * v4 -> v5: auto-remove the local-only Santorini demo trip (fixed id
       *           `t-flight`) from existing stores (Galli chose "delete
       *           automatically"). Only the fixed demo id is dropped — never a
       *           user-created trip — and it is idempotent (safe if already gone).
       */
      migrate: (persisted, version) => {
        const state = persisted as { trips?: Trip[]; members?: Member[] } | undefined
        if (!state) return state as never
        if (version < 2 && Array.isArray(state.trips)) {
          state.trips = state.trips.map((t) =>
            t.checklist ? t : { ...t, checklist: makeDefaultChecklist(t.id) },
          )
        }
        if (version < 3 && Array.isArray(state.trips)) {
          const allIds = (state.members ?? []).map((m) => m.id)
          state.trips = state.trips.map((t) => ({
            ...t,
            members: t.members ?? allIds,
            joinCode: t.joinCode ?? generateJoinCode(),
            days: (t.days ?? []).map((d) => ({ ...d, activities: d.activities ?? [] })),
          }))
        }
        if (version < 4 && Array.isArray(state.trips)) {
          state.trips = state.trips.map((t) =>
            t.id === 't-drive' && t.name === 'סופ"ש בגליל'
              ? { ...makeDriveTrip(), order: t.order }
              : t,
          )
        }
        if (version < 5 && Array.isArray(state.trips)) {
          // Remove ONLY the fixed Santorini demo id; user trips carry generated
          // ids (`t-<base36>-<n>`) and can never match this literal.
          state.trips = state.trips.filter((t) => t.id !== 't-flight')
        }
        if (version < 7 && Array.isArray(state.trips)) {
          // A single `attachment` became a LIST, so an activity can carry both a
          // link to the attraction and a link to the tickets.
          state.trips = state.trips.map((t) => ({
            ...t,
            days: (t.days ?? []).map((d) => ({
              ...d,
              activities: (d.activities ?? []).map((a) => {
                if (a.attachments || !a.attachment) return a
                const { attachment, ...rest } = a
                return { ...rest, attachments: [attachment] }
              }),
            })),
          }))
        }
        if (version < 6) {
          // The palette became APP-WIDE. Lift whatever a trip already carried
          // into the global setting so an existing choice is never lost.
          const s = state as { trips?: Trip[]; paletteId?: string }
          const chosen = (s.trips ?? []).find((t) => t.paletteId && t.paletteId !== 'coral')?.paletteId
          if (!s.paletteId && chosen) s.paletteId = chosen
        }
        return state as never
      },
    },
  ),
)

/** Convenience selectors (hooks). */
export const useCurrentMember = (): Member | null => {
  const id = useStore((s) => s.currentUserId)
  const members = useStore((s) => s.members)
  return members.find((m) => m.id === id) ?? null
}

export type { Member, Trip, Entry, Photo, Activity, Role, Figure }
