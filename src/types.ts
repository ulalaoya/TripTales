export type Role = 'מבוגר' | 'ילד'

export type Figure =
  // Set 1 קלאסי
  | 'crown' | 'stiletto' | 'capstar' | 'bow' | 'camera' | 'flower' | 'star' | 'paw'
  // Set 2 טבע
  | 'mountains' | 'branch' | 'tent' | 'butterfly' | 'campfire' | 'daisy' | 'plane' | 'leaf'
  // Set 3 מינימליסטי
  | 'person' | 'heart' | 'bolt' | 'sparkle' | 'glasses' | 'chat' | 'music' | 'smiley'
  // Set 4 טיולים
  | 'suitcase' | 'sunhat' | 'surfboard' | 'icecream' | 'signpost' | 'sunglasses' | 'balloon' | 'lifebuoy'

export type Transport = 'flight' | 'drive'

export type PhotoStatus = 'approved' | 'pending'

/** reacts: emoji -> list of memberIds who reacted */
export type Reacts = Record<string, string[]>

export interface Member {
  id: string
  phone: string
  name: string
  role: Role
  figure: Figure
  color: string
  email?: string
  /**
   * Cloud only: the Firebase Anonymous Auth uid that last claimed this member.
   * The PHONE stays the human identifier; this uid is the security principal
   * used by the Firestore rules. Absent in pure local mode.
   */
  uid?: string
}

export interface Photo {
  id: string
  src?: string
  svg?: string
  caption: string
  fav: boolean
  by: string
  status: PhotoStatus
  reacts: Reacts
  /** Optional mood emoji chosen in the "רגע חדש" composer. */
  mood?: string
  /** Optional list of member ids tagged as "who was there". */
  people?: string[]
  /** Cloud only: last-write-wins stamp (ms). Absent in pure local mode. */
  updatedAt?: number
}

export interface Entry {
  id: string
  text: string
  mood: string
  loc?: string
  author: string
  ts: number
  reacts: Reacts
  /** Optional list of member ids tagged as "who was there". */
  people?: string[]
}

/** A single packable item in an equipment checklist group. */
export interface ChecklistItem {
  id: string
  label: string
  /** member id, or 'all' for "everyone". */
  owner: string | 'all'
  done: boolean
}

/** A named, emoji-tagged group of checklist items (e.g. בגדים 👕). */
export interface ChecklistGroup {
  id: string
  name: string
  emoji: string
  items: ChecklistItem[]
}

/**
 * An optional file/link attached to an activity — e.g. a flight booking
 * screenshot or a confirmation URL.
 * - `photo`: `value` is a data-URL produced by a file input.
 * - `link`:  `value` is an http(s) URL.
 */
export interface ActivityAttachment {
  kind: 'photo' | 'link'
  value: string
  /** Optional display label (defaults to a generic one in the UI). */
  label?: string
}

/**
 * A single planned activity slot on a day (attraction, restaurant, travel leg).
 * Within a day, activities WITH a `time` are auto-sorted ascending and untimed
 * ones keep their manual (drag) order after them — see `lib/sortActivities`.
 */
export interface Activity {
  id: string
  title: string
  /** Optional 'HH:MM' time. */
  time?: string
  /** Optional emoji picked from the preset row. */
  icon?: string
  /** Optional place name OR pasted Maps/Waze link → navigation chip. */
  loc?: string
  /** Optional free-text notes. */
  notes?: string
  /** Optional flight/booking details attachment. */
  attachment?: ActivityAttachment
}

export interface Day {
  id: string
  date: string
  title: string
  /** Ordered activity slots for the day. */
  activities: Activity[]
  entries: Entry[]
  photos: Photo[]
}

export interface Trip {
  id: string
  name: string
  /**
   * @deprecated Removed from the product (the trip NAME conveys the
   * destination). Kept optional so persisted/seeded data still type-checks;
   * nothing in the UI reads it.
   */
  destination?: string
  startDate: string
  endDate: string
  transport: Transport
  order: number
  days: Day[]
  /** Member ids who belong to (and can be shown for) this trip. */
  members: string[]
  /** Per-trip join code for effective sharing. */
  joinCode: string
  /** When true the trip is a loose idea (status derived as 'idea'). */
  idea?: boolean
  /**
   * Chosen cover photo id (Galli feedback #20). A planner may pin any approved
   * photo across the album as the trip's representative cover; when unset (or
   * the chosen photo is gone/unapproved) the first approved photo is used. See
   * `lib/tripCover.coverPhotoOf`.
   */
  coverPhotoId?: string
  /** Equipment / packing checklist groups. */
  checklist?: ChecklistGroup[]
  /**
   * Cloud only: the anonymous auth uids allowed to read/write this trip.
   * Firestore rules key off this array. Absent in pure local mode.
   */
  memberUids?: string[]
  /** Cloud only: last-write-wins stamp (ms). Absent in pure local mode. */
  updatedAt?: number
}
