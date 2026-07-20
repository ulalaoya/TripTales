import type { Member, Trip } from '../types'
import { normalizeJoinCode } from './joinCode'

/**
 * Per-trip permission layer. Composes ON TOP of the global role matrix in
 * `permissions.ts` (`can()`): planning a trip requires BOTH trip membership and
 * the global 'מבוגר' role. A remote adapter can later swap `trip.members` for a
 * synced source without changing these predicates.
 */

/** True when `memberId` is a member of `trip`. */
export function isTripMember(trip: Trip, memberId: string): boolean {
  return (trip.members ?? []).includes(memberId)
}

/** Planning (edit days/activities/dates) — member of the trip AND an adult. */
export function canPlanTrip(trip: Trip, member: Member): boolean {
  return isTripMember(trip, member.id) && member.role === 'מבוגר'
}

/** Approving/rejecting child photos — same rule as planning. */
export function canApprovePhotos(trip: Trip, member: Member): boolean {
  return canPlanTrip(trip, member)
}

/** True when `code` matches the trip's join code after normalization. */
export function canJoinWithCode(trip: Trip, code: string): boolean {
  return normalizeJoinCode(trip.joinCode ?? '') === normalizeJoinCode(code)
}
