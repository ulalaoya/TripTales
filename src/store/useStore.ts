import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Member, Trip, Entry, Photo, Role, Figure, ChecklistGroup, ChecklistItem } from '../types'
import { SEED_MEMBERS, SEED_TRIPS, makeDefaultChecklist } from '../data/seed'
import { normalizePhone } from '../lib/phone'
import { toggleReact } from '../lib/reactions'
import { uploadStatusFor } from '../lib/permissions'
import { canEditChecklist } from '../lib/checklist'
import type { Lang } from '../i18n'

export type LoginResult =
  | { kind: 'known'; member: Member }
  | { kind: 'unknown'; phone: string }

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
  updateProfile: (patch: Partial<Pick<Member, 'name' | 'figure' | 'color' | 'role' | 'email'>>) => void
  /** Parent-only: change another member's role (R2 profile.editRole). */
  setMemberRole: (memberId: string, role: Role) => void
  logout: () => void

  addTrip: (t: Omit<Trip, 'id' | 'order' | 'days'> & { days?: Trip['days'] }) => Trip
  updateTrip: (id: string, patch: Partial<Trip>) => void
  deleteTrip: (id: string) => void
  reorderTrip: (id: string, dir: -1 | 1) => void

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
  /** Toggle an item done/undone — allowed for both roles. */
  toggleChecklistItem: (tripId: string, groupId: string, itemId: string) => void
  /** Add an item to a group — parent-only (guarded). */
  addChecklistItem: (tripId: string, groupId: string, item: { label: string; owner: string }) => void
  /** Delete an item — parent-only (guarded). */
  deleteChecklistItem: (tripId: string, groupId: string, itemId: string) => void
  /** Add a group — parent-only (guarded). */
  addChecklistGroup: (tripId: string, group: { name: string; emoji: string }) => void
  /** Delete a group — parent-only (guarded). */
  deleteChecklistGroup: (tripId: string, groupId: string) => void
}

let idc = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(idc++).toString(36)}`

function mapDays(trip: Trip, dayId: string, fn: (d: Trip['days'][number]) => Trip['days'][number]): Trip {
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

      logout: () => set({ currentUserId: null }),

      addTrip: (t) => {
        const order = get().trips.reduce((mx, x) => Math.max(mx, x.order), -1) + 1
        const id = uid('t')
        const trip: Trip = {
          id,
          order,
          days: t.days ?? [],
          ...t,
          checklist: t.checklist ?? makeDefaultChecklist(id),
        }
        set((s) => ({ trips: [...s.trips, trip] }))
        return trip
      },

      updateTrip: (id, patch) =>
        set((s) => ({ trips: s.trips.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

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

      addEntry: (tripId, dayId, entry) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : mapDays(t, dayId, (d) => ({
                  ...d,
                  entries: [...d.entries, { ...entry, id: uid('e'), ts: Date.now(), reacts: {} }],
                })),
          ),
        })),

      deleteEntry: (tripId, dayId, entryId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : mapDays(t, dayId, (d) => ({ ...d, entries: d.entries.filter((e) => e.id !== entryId) })),
          ),
        })),

      addPhoto: (tripId, dayId, photo, uploaderRole) => {
        const status = uploadStatusFor(uploaderRole)
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : mapDays(t, dayId, (d) => ({
                  ...d,
                  photos: [...d.photos, { ...photo, id: uid('p'), status, fav: false, reacts: {} }],
                })),
          ),
        }))
        return status
      },

      approvePhoto: (tripId, dayId, photoId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : mapDays(t, dayId, (d) => ({
                  ...d,
                  photos: d.photos.map((p) => (p.id === photoId ? { ...p, status: 'approved' } : p)),
                })),
          ),
        })),

      rejectPhoto: (tripId, dayId, photoId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : mapDays(t, dayId, (d) => ({ ...d, photos: d.photos.filter((p) => p.id !== photoId) })),
          ),
        })),

      toggleFav: (tripId, dayId, photoId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : mapDays(t, dayId, (d) => ({
                  ...d,
                  photos: d.photos.map((p) =>
                    p.id === photoId && p.status === 'approved' ? { ...p, fav: !p.fav } : p,
                  ),
                })),
          ),
        })),

      reactEntry: (tripId, dayId, entryId, emoji, memberId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : mapDays(t, dayId, (d) => ({
                  ...d,
                  entries: d.entries.map((e) =>
                    e.id === entryId ? { ...e, reacts: toggleReact(e.reacts, emoji, memberId) } : e,
                  ),
                })),
          ),
        })),

      reactPhoto: (tripId, dayId, photoId, emoji, memberId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : mapDays(t, dayId, (d) => ({
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
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : mapGroup(t, groupId, (g) => ({
                  ...g,
                  items: g.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
                })),
          ),
        })),

      addChecklistItem: (tripId, groupId, item) =>
        set((s) => {
          const me = s.members.find((m) => m.id === s.currentUserId)
          if (!me || !canEditChecklist(me.role)) return {} // parent-only guard
          const newItem: ChecklistItem = {
            id: uid('ci'),
            label: item.label,
            owner: item.owner,
            done: false,
          }
          return {
            trips: s.trips.map((t) =>
              t.id !== tripId
                ? t
                : mapGroup(t, groupId, (g) => ({ ...g, items: [...g.items, newItem] })),
            ),
          }
        }),

      deleteChecklistItem: (tripId, groupId, itemId) =>
        set((s) => {
          const me = s.members.find((m) => m.id === s.currentUserId)
          if (!me || !canEditChecklist(me.role)) return {} // parent-only guard
          return {
            trips: s.trips.map((t) =>
              t.id !== tripId
                ? t
                : mapGroup(t, groupId, (g) => ({
                    ...g,
                    items: g.items.filter((it) => it.id !== itemId),
                  })),
            ),
          }
        }),

      addChecklistGroup: (tripId, group) =>
        set((s) => {
          const me = s.members.find((m) => m.id === s.currentUserId)
          if (!me || !canEditChecklist(me.role)) return {} // parent-only guard
          const newGroup: ChecklistGroup = {
            id: uid('cg'),
            name: group.name,
            emoji: group.emoji,
            items: [],
          }
          return {
            trips: s.trips.map((t) =>
              t.id !== tripId ? t : { ...t, checklist: [...(t.checklist ?? []), newGroup] },
            ),
          }
        }),

      deleteChecklistGroup: (tripId, groupId) =>
        set((s) => {
          const me = s.members.find((m) => m.id === s.currentUserId)
          if (!me || !canEditChecklist(me.role)) return {} // parent-only guard
          return {
            trips: s.trips.map((t) =>
              t.id !== tripId
                ? t
                : { ...t, checklist: (t.checklist ?? []).filter((g) => g.id !== groupId) },
            ),
          }
        }),
    }),
    {
      name: 'triptales-store',
      version: 2,
      partialize: (s) => ({
        lang: s.lang,
        members: s.members,
        trips: s.trips,
        currentUserId: s.currentUserId,
      }),
      /**
       * v1 -> v2: back-fill a default equipment checklist onto any persisted
       * trip that predates the feature. Everything else is left untouched.
       */
      migrate: (persisted, version) => {
        const state = persisted as { trips?: Trip[] } | undefined
        if (!state) return state as never
        if (version < 2 && Array.isArray(state.trips)) {
          state.trips = state.trips.map((t) =>
            t.checklist ? t : { ...t, checklist: makeDefaultChecklist(t.id) },
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

export type { Member, Trip, Entry, Photo, Role, Figure }
