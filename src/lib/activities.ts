import type { Activity, Day } from '../types'

/** Clamp `n` into the inclusive range [min, max]. */
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(n, max))
}

/**
 * Immutably move an activity within a list from `fromIndex` to `toIndex`.
 * Never mutates the input; returns a new array. Out-of-range `fromIndex`
 * yields a shallow copy unchanged; `toIndex` is clamped into range.
 */
export function reorderActivities(
  list: Activity[],
  fromIndex: number,
  toIndex: number,
): Activity[] {
  const next = list.slice()
  if (fromIndex < 0 || fromIndex >= next.length) return next
  const [item] = next.splice(fromIndex, 1)
  next.splice(clamp(toIndex, 0, next.length), 0, item)
  return next
}

/**
 * Immutably move an activity between days (or reorder within one day when
 * `fromDayId === toDayId`). Returns the SAME `days` reference (no-op) when any
 * id is invalid, so callers can cheaply detect a rejected move.
 */
export function moveActivityToDay(
  days: Day[],
  fromDayId: string,
  toDayId: string,
  activityId: string,
  toIndex: number,
): Day[] {
  const fromDay = days.find((d) => d.id === fromDayId)
  const toDay = days.find((d) => d.id === toDayId)
  if (!fromDay || !toDay) return days

  const fromIndex = fromDay.activities.findIndex((a) => a.id === activityId)
  if (fromIndex < 0) return days

  // Same-day reorder reuses reorderActivities.
  if (fromDayId === toDayId) {
    const activities = reorderActivities(fromDay.activities, fromIndex, toIndex)
    return days.map((d) => (d.id === fromDayId ? { ...d, activities } : d))
  }

  const activity = fromDay.activities[fromIndex]
  const nextFrom = fromDay.activities.filter((a) => a.id !== activityId)
  const at = clamp(toIndex, 0, toDay.activities.length)
  const nextTo = [...toDay.activities.slice(0, at), activity, ...toDay.activities.slice(at)]

  return days.map((d) => {
    if (d.id === fromDayId) return { ...d, activities: nextFrom }
    if (d.id === toDayId) return { ...d, activities: nextTo }
    return d
  })
}
