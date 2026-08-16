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
  /**
   * True for a photo added from the trip's Settings rather than from a specific
   * day. It is still STORED on the first day (photos live inside days), but the
   * album groups it under "כללי" instead of pretending it belongs to that date.
   */
  general?: boolean
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
  /**
   * @deprecated Superseded by `attachments` (an activity may carry several —
   * e.g. a link to the attraction AND a link to the tickets). Kept so persisted
   * and cloud data still type-checks; the v6→v7 migration folds it into the
   * array. Nothing in the UI reads it.
   */
  attachment?: ActivityAttachment
  /** Booking links / screenshots, each shown on its own row. */
  attachments?: ActivityAttachment[]
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
  /**
   * @deprecated The palette is an APP-WIDE setting now (`useStore().paletteId`),
   * chosen from any trip's Settings but applied everywhere. Kept so persisted
   * and cloud trips still type-check; the store's v5→v6 migration lifts any
   * value found here into the global setting. Nothing reads it for theming.
   */
  paletteId?: string
  /** Equipment / packing checklist groups. */
  checklist?: ChecklistGroup[]
  /**
   * Cloud only: the anonymous auth uids allowed to read/write this trip.
   * Firestore rules key off this array. Absent in pure local mode.
   */
  memberUids?: string[]
  /** Cloud only: last-write-wins stamp (ms). Absent in pure local mode. */
  updatedAt?: number
  /**
   * Ids of activities, entries and photos that were deliberately DELETED, each
   * mapped to when (ms).
   *
   * Merging unions content rather than replacing it, so an older copy of a trip
   * can never delete newer work simply by not knowing about it (see
   * `lib/mergeTrips`). Deletes therefore have to be stated explicitly: this is
   * how "I removed this" is distinguished from "I never had this".
   */
  deleted?: Record<string, number>
}
