/**
 * Trip cover-photo resolution (PURE — no store, no I/O).
 *
 * The representative cover for a trip (shown on dashboard cards and the trip
 * header). A planner may pin one explicitly via `Trip.coverPhotoId`; otherwise
 * the first approved photo across the trip's days (in day order) is used.
 *
 * Rules, in order (Galli feedback #20):
 * 1. If `trip.coverPhotoId` is set AND that photo still exists AND is approved,
 *    return it.
 * 2. Otherwise return the first approved photo across days, in order.
 * 3. Otherwise return `undefined`.
 *
 * Never throws — tolerates missing/empty `days` and `photos`.
 */

import type { Photo, Trip } from '../types'

export function coverPhotoOf(trip: Trip): Photo | undefined {
  const days = trip?.days ?? []

  const chosenId = trip?.coverPhotoId
  if (chosenId) {
    for (const day of days) {
      for (const photo of day?.photos ?? []) {
        if (photo.id === chosenId && photo.status === 'approved') return photo
      }
    }
  }

  for (const day of days) {
    for (const photo of day?.photos ?? []) {
      if (photo.status === 'approved') return photo
    }
  }

  return undefined
}
