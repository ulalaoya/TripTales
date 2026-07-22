/**
 * The cloud sync layer — offline-first Firestore mirroring.
 *
 * ── Contract with local mode ────────────────────────────────────────────────
 * EVERY exported function returns immediately when `isCloudEnabled` is false.
 * Nothing here subscribes, logs, times out or touches the store in local mode,
 * and `firebase/*` is only ever reached through `getCloudSdk()`'s dynamic
 * import — so a cloud-less build never even downloads the SDK chunk.
 *
 * ── How it works ───────────────────────────────────────────────────────────
 * Zustand + localStorage stays the source of truth for rendering. Firestore is
 * a side channel:
 *
 *   • PUSH — one debounced watcher on the store diffs the signed-in user's
 *     trips against the last thing we wrote and pushes only what changed. This
 *     covers every mutating action at once (no action needs to know about the
 *     cloud), and the local update stays fully optimistic — the UI never waits.
 *   • PULL — `onSnapshot` on `trips where memberUids array-contains myUid`,
 *     plus one snapshot per trip's `photos` subcollection. Incoming documents
 *     are merged last-write-wins on `updatedAt` (see `mergeRemote.pickNewer`).
 *
 * ── Identity ───────────────────────────────────────────────────────────────
 * Auth is Firebase ANONYMOUS auth. The visible login flow is unchanged (type an
 * Israeli phone → in); the phone remains the human identifier and the anonymous
 * uid is the security principal the Firestore rules key off.
 *
 * ── Known, accepted trade-offs ─────────────────────────────────────────────
 * • No SMS verification, so anyone who learns a join code can join that trip.
 * • `updatedAt` is written with `serverTimestamp()` but the optimistic local
 *   copy is stamped with `Date.now()`, so clock skew can decide a tie. The next
 *   snapshot echoes the server value back and self-corrects.
 * • Deleting a trip locally does NOT delete it for the family — it removes this
 *   user from `memberUids` / `members`, i.e. it means "leave the trip".
 * • The Santorini demo trip (`t-flight`) is NEVER uploaded, by design.
 */

import type { Unsubscribe } from 'firebase/firestore'
import { getCloudSdk, isCloudEnabled, type Db, type FsApi } from './firebase'
import { useStore } from '../store/useStore'
import { docToTrip, memberUidsOfDoc, photosOfTrip, tripToDoc, type PhotoDoc } from './firestoreMap'
import { withinFirestoreLimit } from './imageSize'
import { normalizeJoinCode } from './joinCode'
import { normalizePhone } from './phone'
import { phoneHash } from './phoneHash'
import { STRINGS } from '../i18n'
import type { RemoteMember } from '../store/useStore'
import type { Member, Trip } from '../types'

/** The seeded Santorini demo trip stays local-only — never uploaded. */
export const LOCAL_ONLY_TRIP_IDS = ['t-flight']

/** How long to coalesce local edits before pushing. */
const PUSH_DEBOUNCE_MS = 400

export type CloudJoinResult =
  | { ok: true; tripId: string }
  | { ok: false; reason: 'already'; tripId: string }
  | { ok: false; reason: 'notfound' | 'offline' }

// ---------------------------------------------------------------------------
// Module state (all inert in local mode)
// ---------------------------------------------------------------------------

let started = false
let myUid: string | null = null
let unsubscribes: Unsubscribe[] = []
let unwatchStore: (() => void) | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
let flushing = false
let flushAgain = false
let warnedTooBig = false

/** tripId → signature of the trip document we last wrote (or last received). */
const tripSignatures = new Map<string, string>()
/** `${tripId}/${photoId}` → signature of the photo doc we last wrote/received. */
const photoSignatures = new Map<string, string>()

const photoUnsubs = new Map<string, Unsubscribe>()
const remoteTripDocs = new Map<string, Record<string, unknown>>()
const remotePhotos = new Map<string, Map<string, PhotoDoc>>()

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function str(key: 'syncFailed' | 'syncPhotoTooBig'): string {
  return STRINGS[useStore.getState().lang][key]
}

function setState(next: Parameters<ReturnType<typeof useStore.getState>['setSyncState']>[0]): void {
  if (useStore.getState().syncState !== next) useStore.getState().setSyncState(next)
}

/** Report a cloud failure without ever breaking the local experience. */
function reportFailure(err: unknown, toast = true): void {
  setState('offline')
  if (toast) useStore.getState().showToast(str('syncFailed'))
  if (import.meta.env.DEV) console.warn('[TripTales sync]', err)
}

/** Firestore Timestamp | number | anything → millis, or `undefined`. */
function toMillis(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const ts = value as { toMillis?: () => number; seconds?: number } | null
  if (ts && typeof ts.toMillis === 'function') return ts.toMillis()
  if (ts && typeof ts.seconds === 'number') return ts.seconds * 1000
  return undefined
}

function union(a: string[] | undefined, b: string[]): string[] {
  const out = [...(a ?? [])]
  for (const x of b) if (!out.includes(x)) out.push(x)
  return out
}

/** Trip-document signature, ignoring the stamp we ourselves rewrite each push. */
function tripSignature(doc: object): string {
  const { updatedAt: _ignored, ...rest } = doc as Record<string, unknown>
  void _ignored
  return JSON.stringify(rest)
}

/** Cheap photo signature — hashes sizes rather than whole base64 payloads. */
function photoSignature(p: PhotoDoc): string {
  const src = typeof p.src === 'string' ? p.src : ''
  const svg = typeof p.svg === 'string' ? p.svg : ''
  return [
    p.id,
    p.dayId,
    String(p.caption ?? ''),
    String(p.fav ?? ''),
    String(p.status ?? ''),
    String(p.by ?? ''),
    String(p.mood ?? ''),
    JSON.stringify(p.people ?? null),
    JSON.stringify(p.reacts ?? null),
    `s${src.length}`,
    `v${svg.length}`,
  ].join('|')
}

/** The trips this device should mirror: mine, minus the local-only demo. */
function myTrips(): Trip[] {
  const s = useStore.getState()
  const me = s.currentUserId
  if (!me) return []
  return s.trips.filter((t) => !LOCAL_ONLY_TRIP_IDS.includes(t.id) && t.members.includes(me))
}

// ---------------------------------------------------------------------------
// Sign-in / teardown
// ---------------------------------------------------------------------------

/**
 * Sign in anonymously, claim this phone's member document, open the snapshots
 * and push anything this device already has (that is the Galilee migration).
 * No-op in local mode, and safe to call repeatedly.
 */
export async function cloudSignIn(): Promise<void> {
  if (!isCloudEnabled || started) return
  const sdkPromise = getCloudSdk()
  if (!sdkPromise) return
  if (!useStore.getState().currentUserId) return

  started = true
  setState('connecting')
  try {
    const { auth, authApi, db, fs } = await sdkPromise
    const credential = await authApi.signInAnonymously(auth)
    myUid = credential.user.uid
    useStore.getState().setCloudUid(myUid)

    await claimMemberDoc(db, fs)
    subscribeMembers(db, fs)
    subscribeTrips(db, fs)
    watchLocalChanges()

    // First push = the migration. `myTrips()` excludes `t-flight`, so the
    // Galilee trip (and any trip made since) goes up, the demo never does.
    await flushNow()
    if (useStore.getState().syncState !== 'offline') setState('synced')
  } catch (err) {
    started = false
    reportFailure(err, true)
  }
}

/** Tear everything down (logout). Safe to call when nothing was ever started. */
export function cloudStop(): void {
  for (const un of unsubscribes) {
    try {
      un()
    } catch {
      /* ignore */
    }
  }
  for (const un of photoUnsubs.values()) {
    try {
      un()
    } catch {
      /* ignore */
    }
  }
  unsubscribes = []
  photoUnsubs.clear()
  remoteTripDocs.clear()
  remotePhotos.clear()
  tripSignatures.clear()
  photoSignatures.clear()
  if (unwatchStore) unwatchStore()
  unwatchStore = null
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = null
  started = false
  warnedTooBig = false
  myUid = null
  if (isCloudEnabled) {
    useStore.getState().setCloudUid(null)
    setState('off')
  }
}

/**
 * Find or create `members/{id}` for the signed-in phone and stamp our uid on it.
 *
 * If the cloud already knows this phone under a different member id, this
 * device ADOPTS that id (see `lib/memberIdentity`) so the same human is one
 * person across phones. Per the approved no-SMS model, a pre-existing document
 * owned by another uid is still claimable — we simply record the latest uid.
 *
 * PRIVACY — the synced member shape is deliberately minimal:
 *
 *     { phoneHash, name, role, figure, color, uid }
 *
 * The plaintext `phone` is NEVER written (only `phoneHash`, see `lib/phoneHash`)
 * and `email` is NEVER written at all. Both stay in localStorage on the device
 * that owns them. Anonymous auth is open to the world and this repo is public,
 * so anything readable by "a signed-in user" is readable by anyone — a
 * plaintext contact list must never exist up there.
 */
async function claimMemberDoc(database: Db, fs: FsApi): Promise<void> {
  const state = useStore.getState()
  const me = state.members.find((m) => m.id === state.currentUserId)
  if (!me || !myUid) return
  if (normalizePhone(me.phone) === '') return

  const hash = phoneHash(me.phone)
  const found = await fs.getDocs(fs.query(fs.collection(database, 'members'), fs.where('phoneHash', '==', hash)))
  const remote = found.docs[0]

  if (remote && remote.id !== me.id) useStore.getState().adoptMemberId(me.id, remote.id)

  const memberId = useStore.getState().currentUserId
  if (!memberId) return
  const mine = useStore.getState().members.find((m) => m.id === memberId)
  if (!mine) return

  await fs.setDoc(
    fs.doc(database, 'members', memberId),
    {
      phoneHash: hash,
      name: mine.name,
      role: mine.role,
      figure: mine.figure,
      color: mine.color,
      uid: myUid,
    },
    { merge: true },
  )
  useStore.getState().setMemberUid(memberId, myUid)
}

// ---------------------------------------------------------------------------
// PULL — snapshots
// ---------------------------------------------------------------------------

function subscribeMembers(database: Db, fs: FsApi): void {
  unsubscribes.push(
    fs.onSnapshot(
      fs.collection(database, 'members'),
      (snap) => {
        // Only presentation fields are pulled down. `phone` and `email` are
        // never in these documents, and are never invented here either — a
        // member's real phone exists only on that member's own device.
        const incoming: RemoteMember[] = []
        snap.forEach((d) => {
          const data = d.data() as Partial<Member> | undefined
          if (!data) return
          incoming.push({
            id: d.id,
            name: data.name ?? '',
            role: (data.role ?? 'ילד') as Member['role'],
            figure: (data.figure ?? 'person') as Member['figure'],
            color: data.color ?? 'linear-gradient(145deg,#42b8d4,#67d3bd)',
            ...(data.uid ? { uid: data.uid } : {}),
          })
        })
        useStore.getState().applyRemoteMembers(incoming)
      },
      (err) => reportFailure(err, false),
    ),
  )
}

function subscribeTrips(database: Db, fs: FsApi): void {
  const q = fs.query(fs.collection(database, 'trips'), fs.where('memberUids', 'array-contains', myUid))
  unsubscribes.push(
    fs.onSnapshot(
      q,
      (snap) => {
        for (const change of snap.docChanges()) {
          const tripId = change.doc.id
          if (change.type === 'removed') {
            const un = photoUnsubs.get(tripId)
            if (un) un()
            photoUnsubs.delete(tripId)
            remoteTripDocs.delete(tripId)
            remotePhotos.delete(tripId)
            continue
          }
          remoteTripDocs.set(tripId, { ...(change.doc.data() as Record<string, unknown>), id: tripId })
          subscribePhotos(database, fs, tripId)
          mergeTrip(tripId)
        }
      },
      (err) => reportFailure(err, false),
    ),
  )
}

function subscribePhotos(database: Db, fs: FsApi, tripId: string): void {
  if (photoUnsubs.has(tripId)) return
  const un = fs.onSnapshot(
    fs.collection(database, 'trips', tripId, 'photos'),
    (snap) => {
      const map = new Map<string, PhotoDoc>()
      snap.forEach((d) => {
        const data = d.data() as Record<string, unknown>
        map.set(d.id, { ...data, id: d.id, dayId: String(data.dayId ?? '') })
      })
      remotePhotos.set(tripId, map)
      mergeTrip(tripId)
    },
    (err) => reportFailure(err, false),
  )
  photoUnsubs.set(tripId, un)
}

/** Rebuild one trip from its remote document + photos and merge it locally. */
function mergeTrip(tripId: string): void {
  const raw = remoteTripDocs.get(tripId)
  if (!raw) return

  const photos = [...(remotePhotos.get(tripId)?.values() ?? [])].map((p) => ({
    ...p,
    updatedAt: toMillis(p.updatedAt),
  }))
  const normalised = { ...raw, updatedAt: toMillis(raw.updatedAt) }
  const trip = docToTrip(normalised, photos as Array<{ id: string; dayId: string }>)
  trip.memberUids = memberUidsOfDoc(raw)

  useStore.getState().applyRemoteTrip(trip)

  // Record the REMOTE signatures: if the merge kept the local copy (because it
  // was newer) the signatures will differ and the watcher pushes it, which is
  // exactly right. If the remote copy won, they match and nothing echoes back.
  tripSignatures.set(tripId, tripSignature(tripToDoc(trip, trip.memberUids ?? [])))
  for (const p of photosOfTrip(trip)) photoSignatures.set(`${tripId}/${p.id}`, photoSignature(p))
}

// ---------------------------------------------------------------------------
// PUSH — debounced diff of the local store
// ---------------------------------------------------------------------------

function watchLocalChanges(): void {
  if (unwatchStore) return
  unwatchStore = useStore.subscribe((state, prev) => {
    if (!state.currentUserId) {
      cloudStop()
      return
    }
    if (state.trips !== prev.trips) schedulePush()
  })
}

function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void flushNow()
  }, PUSH_DEBOUNCE_MS)
}

/** Push every changed trip / photo. Never throws. */
async function flushNow(): Promise<void> {
  if (!isCloudEnabled || !myUid) return
  if (flushing) {
    flushAgain = true
    return
  }
  flushing = true
  try {
    const sdkPromise = getCloudSdk()
    if (!sdkPromise) return
    const { db, fs } = await sdkPromise
    const memberId = useStore.getState().currentUserId
    if (!memberId) return

    const trips = myTrips()
    const liveIds = new Set(trips.map((t) => t.id))
    let wrote = false

    for (const trip of trips) {
      wrote = (await pushTrip(db, fs, trip, memberId)) || wrote
    }

    // A trip that vanished locally means "I left it" — never a family-wide delete.
    for (const tripId of [...tripSignatures.keys()]) {
      if (liveIds.has(tripId)) continue
      tripSignatures.delete(tripId)
      try {
        await fs.updateDoc(fs.doc(db, 'trips', tripId), {
          memberUids: fs.arrayRemove(myUid),
          members: fs.arrayRemove(memberId),
        })
      } catch (err) {
        reportFailure(err, false)
      }
    }

    if (wrote && useStore.getState().syncState !== 'offline') setState('synced')
  } catch (err) {
    reportFailure(err, false)
  } finally {
    flushing = false
    if (flushAgain) {
      flushAgain = false
      schedulePush()
    }
  }
}

/** Write one trip document + its changed photos. Returns true if anything went up. */
async function pushTrip(
  db: Db,
  fs: FsApi,
  trip: Trip,
  memberId: string,
): Promise<boolean> {
  if (!myUid) return false
  const memberUids = union(trip.memberUids, [myUid])
  const doc = tripToDoc(trip, memberUids)
  const signature = tripSignature(doc)
  let wrote = false

  if (tripSignatures.get(trip.id) !== signature) {
    setState('syncing')
    try {
      const stamp = Date.now()
      await fs.setDoc(fs.doc(db, 'trips', trip.id), { ...doc, updatedAt: fs.serverTimestamp() })
      tripSignatures.set(trip.id, signature)
      useStore.getState().markTripPushed(trip.id, stamp, memberUids)
      wrote = true

      const code = normalizeJoinCode(trip.joinCode ?? '')
      if (code) await fs.setDoc(fs.doc(db, 'joinCodes', code), { tripId: trip.id }, { merge: true })
    } catch (err) {
      reportFailure(err, false)
      return wrote
    }
  }

  const photos = photosOfTrip(trip)
  const livePhotoIds = new Set(photos.map((p) => p.id))

  for (const photo of photos) {
    const key = `${trip.id}/${photo.id}`
    const signature = photoSignature(photo)
    if (photoSignatures.get(key) === signature) continue

    const src = typeof photo.src === 'string' ? photo.src : ''
    if (src && !withinFirestoreLimit(src)) {
      // Too big for one Firestore document: keep it local, say so once.
      if (!warnedTooBig) {
        warnedTooBig = true
        useStore.getState().showToast(str('syncPhotoTooBig'))
      }
      photoSignatures.set(key, signature)
      continue
    }

    setState('syncing')
    try {
      await fs.setDoc(fs.doc(db, 'trips', trip.id, 'photos', photo.id), {
        ...photo,
        updatedAt: fs.serverTimestamp(),
      })
      photoSignatures.set(key, signature)
      wrote = true
    } catch (err) {
      reportFailure(err, false)
    }
  }

  // Photos removed locally (rejected by a parent) are removed in the cloud too.
  for (const key of [...photoSignatures.keys()]) {
    if (!key.startsWith(`${trip.id}/`)) continue
    const photoId = key.slice(trip.id.length + 1)
    if (livePhotoIds.has(photoId)) continue
    photoSignatures.delete(key)
    try {
      await fs.deleteDoc(fs.doc(db, 'trips', trip.id, 'photos', photoId))
      wrote = true
    } catch (err) {
      reportFailure(err, false)
    }
  }

  void memberId
  return wrote
}

// ---------------------------------------------------------------------------
// Join by code (cloud path)
// ---------------------------------------------------------------------------

/**
 * Resolve `joinCodes/{CODE}` → trip by EXACT document id, then add my uid to
 * `memberUids` and my member id to `members` (the `isSelfJoin` write the rules
 * allow for a non-member). The cloud trip then arrives through the normal
 * `memberUids array-contains` snapshot and merges over any local seed copy.
 *
 * This path is authoritative in cloud mode and must NOT be gated on local
 * state: a fresh install seeds `t-drive`/`SUNSET` locally, so a local trip with
 * the same id routinely exists BEFORE the join — the arrayUnion has to happen
 * regardless so the joiner is actually added to the sharer's cloud trip.
 * "Already a member" is decided only by the cloud `memberUids` (populated by the
 * snapshot for trips I truly belong to), never by the local `members` list.
 *
 * Returns `offline` when cloud mode is not usable — the caller then falls back
 * to the local-only path.
 */
export async function cloudJoinByCode(rawCode: string): Promise<CloudJoinResult> {
  if (!isCloudEnabled || !myUid) return { ok: false, reason: 'offline' }
  const code = normalizeJoinCode(rawCode)
  if (!code) return { ok: false, reason: 'notfound' }

  const sdkPromise = getCloudSdk()
  if (!sdkPromise) return { ok: false, reason: 'offline' }

  try {
    const { db, fs } = await sdkPromise
    const memberId = useStore.getState().currentUserId
    if (!memberId) return { ok: false, reason: 'offline' }

    const codeSnap = await fs.getDoc(fs.doc(db, 'joinCodes', code))
    if (!codeSnap.exists()) return { ok: false, reason: 'notfound' }
    const tripId = (codeSnap.data() as { tripId?: string }).tripId
    if (!tripId) return { ok: false, reason: 'notfound' }

    // Already in the CLOUD trip's `memberUids`? Only a trip the snapshot
    // delivered because I actually belong to it carries my uid here — a local
    // seed copy I have never joined does not, so it cannot short-circuit us.
    const existing = useStore.getState().trips.find((t) => t.id === tripId)
    if (existing?.memberUids?.includes(myUid)) return { ok: false, reason: 'already', tripId }

    // The `isSelfJoin` write — its shape must match the rule EXACTLY:
    // only `memberUids`, `members` and `updatedAt` may be touched.
    await fs.updateDoc(fs.doc(db, 'trips', tripId), {
      memberUids: fs.arrayUnion(myUid),
      members: fs.arrayUnion(memberId),
      updatedAt: fs.serverTimestamp(),
    })

    await waitForTrip(tripId)
    return { ok: true, tripId }
  } catch (err) {
    reportFailure(err, false)
    return { ok: false, reason: 'offline' }
  }
}

/** Wait (briefly) for the joined trip to arrive through the snapshot. */
function waitForTrip(tripId: string, timeoutMs = 5000): Promise<void> {
  if (useStore.getState().trips.some((t) => t.id === tripId)) return Promise.resolve()
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      un()
      clearTimeout(timer)
      resolve()
    }
    const un = useStore.subscribe((s) => {
      if (s.trips.some((t) => t.id === tripId)) finish()
    })
    const timer = setTimeout(finish, timeoutMs)
  })
}
