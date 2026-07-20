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
 * A single planned activity slot on a day (attraction, restaurant, travel leg).
 * Order is the array order within `Day.activities`.
 */
export interface Activity {
  id: string
  title: string
  /** Optional 'HH:MM' time. */
  time?: string
  /** Optional emoji picked from the preset row. */
  icon?: string
  /** Optional location text → Google Maps chip. */
  loc?: string
  /** Optional free-text notes. */
  notes?: string
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
  destination: string
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
  /** Equipment / packing checklist groups. */
  checklist?: ChecklistGroup[]
}
