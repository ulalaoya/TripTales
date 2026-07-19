import type { Role, PhotoStatus } from '../types'

/** Every capability referenced by the R2–R4 role matrix. */
export type Action =
  | 'trip.create'
  | 'trip.edit'
  | 'trip.delete'
  | 'trip.reorder'
  | 'entry.create'
  | 'entry.delete'
  | 'photo.upload'
  | 'photo.approve'
  | 'react'
  | 'favourite'
  | 'share'
  | 'profile.editRole'

const ADULT_ONLY: ReadonlySet<Action> = new Set<Action>([
  'trip.create',
  'trip.edit',
  'trip.delete',
  'trip.reorder',
  'entry.create',
  'entry.delete',
  'photo.approve',
  'profile.editRole',
])

const EVERYONE: ReadonlySet<Action> = new Set<Action>([
  'photo.upload',
  'react',
  'favourite',
  'share',
])

/** R2–R4 permission matrix. Returns true when `role` may perform `action`. */
export function can(role: Role, action: Action): boolean {
  if (EVERYONE.has(action)) return true
  if (ADULT_ONLY.has(action)) return role === 'מבוגר'
  return false
}

/** Status a freshly uploaded photo receives, based on the uploader's role. */
export function uploadStatusFor(role: Role): PhotoStatus {
  return role === 'מבוגר' ? 'approved' : 'pending'
}
