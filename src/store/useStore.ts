import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
} from '../types'
import { SEED_MEMBERS, SEED_TRIPS, makeDefaultChecklist, makeDriveTrip } from '../data/seed'
import { normalizePhone } from '../lib/phone'
import { toggleReact } from '../lib/reactions'
import { uploadStatusFor } from '../lib/permissions'
import { canEditChecklist } from '../lib/checklist'
import { generateJoinCode } from '../lib/joinCode'
import { canJoinWithCode } from '../lib/tripPermissions'
import { reorderActivities, moveActivityToDay } from '../lib/activities'
import { buildDays } from '../lib/days'
import type { Lang } from '../i18n'

export type LoginResult =
  | { kind: 'known'; member: Member }
  | { kind: 'unknown'; phone: string }

export type JoinResult =
  | { ok: true; tripId: string }
  | { ok: false; reason: 'notfound' | 'already' }

interface State {
  lang: Lang
  members: Member[]
  trips: Trip[]
  currentUserId: string | null
  toast: string | null

  setLang: (lang: Lang) => void
  showToast: (msg: string) => void
  clearToast: () => void

  login: (rawPhone: string) => LoginResult
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
  toggleFav: (tripId: string, dayId: string, photoId: string) => void

  reactEntry: (tripId: string, dayId: string, entryId: string, emoji: string, memberId: string) => void
  reactPhoto: (tripId: string, dayId: string, photoId: string, emoji: string, memberId: string) => void

  // ----- Equipment checklist -----
  toggleChecklistItem: (tripId: string, groupId: string, itemId: string) => void
  addChecklistItem: (tripId: string, groupId: string, item: { label: string; owner: string }) => void
  deleteChecklistItem: (tripId: string, groupId: string, itemId: string) => void
  addChecklistGroup: (tripId: string, group: { name: string; emoji: string }) => void
  deleteChecklistGroup: (tripId: string, groupId: string) => void
}

let idc = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(idc++).toString(36)}`

/** Map one trip in state, immutably. */
function mapTrip(trips: Trip[], tripId: string, fn: (t: Trip) => Trip): Trip[] {
  return trips.map((t) => (t.id === tripId ? fn(t) : t))
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
      members: SEED_MEMBERS,
      trips: SEED_TRIPS,
      currentUserId: null,
      toast: null,

      setLang: (lang) => set({ lang }),
      showToast: (msg) => set({ toast: msg }),
      clearToast: () => set({ toast: null }),

      login: (rawPhone) => {
        const phone = normalizePhone(rawPhone)
        const member = get().members.find((m) => m.phone === phone)
        if (member) {
          set({ currentUserId: member.id })
          return { kind: 'known', member }
        }
        return { kind: 'unknown', phone }
      },

      registerMember: (m) => {
        const member: Member = { ...m, id: uid('m') }
        set((s) => ({ members: [...s.members, member], currentUserId: member.id }))
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

      updateTrip: (id, patch) => set((s) => ({ trips: mapTrip(s.trips, id, (t) => ({ ...t, ...patch })) })),

      updateTripDates: (id, startDate, endDate) =>
        set((s) => ({
          trips: mapTrip(s.trips, id, (t) => ({
            ...t,
            startDate,
            endDate,
            days: buildDays(startDate, endDate, t.days),
          })),
        })),

      deleteTrip: (id) => set((s) => ({ trips: s.trips.filter((t) => t.id !== id) })),

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
          trips: mapTrip(s.trips, tripId, (t) =>
            t.members.includes(memberId) ? t : { ...t, members: [...t.members, memberId] },
          ),
        })),

      removeTripMember: (tripId, memberId) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) => ({
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
          trips: mapTrip(st.trips, trip.id, (t) => ({ ...t, members: [...t.members, me] })),
        }))
        return { ok: true, tripId: trip.id }
      },

      updateDayTitle: (tripId, dayId, title) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) => mapDays(t, dayId, (d) => ({ ...d, title }))),
        })),

      // ----- Day activities -----
      addActivity: (tripId, dayId, activity) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({ ...d, activities: [...d.activities, { ...activity, id: uid('a') }] })),
          ),
        })),

      updateActivity: (tripId, dayId, activityId, patch) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({
              ...d,
              activities: d.activities.map((a) => (a.id === activityId ? { ...a, ...patch } : a)),
            })),
          ),
        })),

      deleteActivity: (tripId, dayId, activityId) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({ ...d, activities: d.activities.filter((a) => a.id !== activityId) })),
          ),
        })),

      reorderActivity: (tripId, dayId, fromIndex, toIndex) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({ ...d, activities: reorderActivities(d.activities, fromIndex, toIndex) })),
          ),
        })),

      moveActivity: (tripId, fromDayId, toDayId, activityId, toIndex) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) => ({
            ...t,
            days: moveActivityToDay(t.days, fromDayId, toDayId, activityId, toIndex),
          })),
        })),

      addEntry: (tripId, dayId, entry) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({
              ...d,
              entries: [...d.entries, { ...entry, id: uid('e'), ts: Date.now(), reacts: {} }],
            })),
          ),
        })),

      deleteEntry: (tripId, dayId, entryId) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({ ...d, entries: d.entries.filter((e) => e.id !== entryId) })),
          ),
        })),

      addPhoto: (tripId, dayId, photo, uploaderRole) => {
        const status = uploadStatusFor(uploaderRole)
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({
              ...d,
              photos: [...d.photos, { ...photo, id: uid('p'), status, fav: false, reacts: {} }],
            })),
          ),
        }))
        return status
      },

      approvePhoto: (tripId, dayId, photoId) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({
              ...d,
              photos: d.photos.map((p) => (p.id === photoId ? { ...p, status: 'approved' } : p)),
            })),
          ),
        })),

      rejectPhoto: (tripId, dayId, photoId) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) =>
            mapDays(t, dayId, (d) => ({ ...d, photos: d.photos.filter((p) => p.id !== photoId) })),
          ),
        })),

      toggleFav: (tripId, dayId, photoId) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) =>
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
          trips: mapTrip(s.trips, tripId, (t) =>
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
          trips: mapTrip(s.trips, tripId, (t) =>
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
          trips: mapTrip(s.trips, tripId, (t) =>
            mapGroup(t, groupId, (g) => ({
              ...g,
              items: g.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
            })),
          ),
        })),

      addChecklistItem: (tripId, groupId, item) =>
        set((s) => {
          const me = s.members.find((m) => m.id === s.currentUserId)
          if (!me || !canEditChecklist(me.role)) return {} // parent-only guard
          const newItem: ChecklistItem = { id: uid('ci'), label: item.label, owner: item.owner, done: false }
          return {
            trips: mapTrip(s.trips, tripId, (t) => mapGroup(t, groupId, (g) => ({ ...g, items: [...g.items, newItem] }))),
          }
        }),

      deleteChecklistItem: (tripId, groupId, itemId) =>
        set((s) => {
          const me = s.members.find((m) => m.id === s.currentUserId)
          if (!me || !canEditChecklist(me.role)) return {} // parent-only guard
          return {
            trips: mapTrip(s.trips, tripId, (t) =>
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
            trips: mapTrip(s.trips, tripId, (t) => ({ ...t, checklist: [...(t.checklist ?? []), newGroup] })),
          }
        }),

      deleteChecklistGroup: (tripId, groupId) =>
        set((s) => {
          const me = s.members.find((m) => m.id === s.currentUserId)
          if (!me || !canEditChecklist(me.role)) return {} // parent-only guard
          return {
            trips: mapTrip(s.trips, tripId, (t) => ({
              ...t,
              checklist: (t.checklist ?? []).filter((g) => g.id !== groupId),
            })),
          }
        }),
    }),
    {
      name: 'triptales-store',
      version: 4,
      partialize: (s) => ({
        lang: s.lang,
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
