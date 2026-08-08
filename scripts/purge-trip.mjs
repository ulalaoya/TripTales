// ===========================================================================
// purge-trip.mjs — permanently erase a trip from the cloud.
//
// WHY THIS EXISTS
// ---------------
// In the app, deleting a trip means LEAVING it: the trip vanishes from your
// device and your uid is dropped from `memberUids`, but the document itself
// stays in Firestore so the rest of the family keeps their copy. That is the
// intended product behaviour and this script does NOT change it.
//
// Occasionally a trip needs to be genuinely destroyed — a throwaway test trip,
// say. That is a rare, deliberate, irreversible act, so it lives here as an
// explicit command-line tool rather than as a button anyone can mis-tap.
//
// HOW IT GETS PERMISSION
// ----------------------
// It signs in anonymously and self-joins the trip — exactly the path a cousin
// who was sent the join code would take (see the JOIN EXCEPTION in
// firestore.rules). No admin credentials, no service account.
//
// USAGE
//   node scripts/purge-trip.mjs ABC123            # dry run — reports only
//   node scripts/purge-trip.mjs ABC123 --confirm  # actually deletes
//
// If the trip is no longer on any of your devices you cannot read its join
// code, so target it by document id instead. Note what this implies: the
// isSelfJoin() rule inspects only the SHAPE of the update, never the code, so
// the trip id alone is sufficient to join. Pair it with --expect, which
// aborts (and undoes the self-join) unless the trip's name matches:
//
//   node scripts/purge-trip.mjs --trip-id t-abc123 --expect "טיול נסיון 2" --confirm
//
// Reads the Firebase web config from .env.local (same values the app uses).
// ===========================================================================

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  collection,
  updateDoc,
} from 'firebase/firestore'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Minimal .env parser — enough for KEY=value lines, ignores comments/blanks. */
function readEnv(file) {
  const out = {}
  let text
  try {
    text = readFileSync(resolve(root, file), 'utf8')
  } catch {
    return out
  }
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
    if (!m) continue
    out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...readEnv('.env.local'), ...process.env }

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

const args = process.argv.slice(2)
const confirm = args.includes('--confirm')
const byId = args.includes('--trip-id')

/** Value of a `--flag value` pair, or undefined. */
function flagValue(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

// A guard rail, because a purge cannot be undone. When given, the trip's name
// must contain this text or the script refuses to delete and undoes its own
// self-join. Strongly recommended with --trip-id, where a mistyped id would
// otherwise point at a real family trip.
const expect = flagValue('--expect')

const targets = args
  .filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--expect')
  .map((a) => (byId ? a.trim() : a.trim().toUpperCase()))

if (targets.length === 0) {
  console.error('usage: node scripts/purge-trip.mjs <JOINCODE>... [--confirm]')
  console.error('       node scripts/purge-trip.mjs --trip-id <TRIPID>... --expect <name> [--confirm]')
  process.exit(1)
}
if (!config.apiKey || !config.projectId) {
  console.error('Missing Firebase config — expected VITE_FIREBASE_* in .env.local')
  process.exit(1)
}

const app = initializeApp(config)
const db = getFirestore(app)
const { user } = await signInAnonymously(getAuth(app))
const uid = user.uid

console.log(`project : ${config.projectId}`)
console.log(`uid     : ${uid}`)
console.log(`mode    : ${confirm ? 'DELETE (irreversible)' : 'dry run — nothing will be deleted'}`)
console.log('')

let failures = 0

for (const target of targets) {
  console.log(`── ${target} ──────────────────────────────`)
  try {
    // Resolve the target to a trip. With --trip-id it IS the trip; otherwise
    // the join code is looked up. `codeSnap` stays null in the former case —
    // a trip whose code we never learned simply keeps its dangling code entry,
    // which resolves to a deleted document and is harmless.
    let codeSnap = null
    let tripId = target
    if (!byId) {
      codeSnap = await getDoc(doc(db, 'joinCodes', target))
      if (!codeSnap.exists()) {
        console.log('  join code not found — nothing to do')
        continue
      }
      tripId = codeSnap.data().tripId
    }
    const tripRef = doc(db, 'trips', tripId)
    console.log(`  trip id : ${tripId}`)

    // A trip is readable only by its members, so a code-holder cannot look
    // before it leaps: the self-join has to happen first. That makes a dry run
    // genuinely read-only but also genuinely uninformative — it can confirm the
    // code resolves and stop there.
    let tripSnap = await getDoc(tripRef).catch((err) => {
      if (err?.code === 'permission-denied') return null
      throw err
    })

    if (!tripSnap) {
      if (!confirm) {
        console.log('  not a member yet — would self-join, then delete photos + trip + code')
        continue
      }
      // A self-join onto a missing document is refused rather than reported as
      // "not found" — the rule needs a `resource` to compare against — so an
      // already-purged trip surfaces here as permission-denied.
      const joined = await updateDoc(tripRef, { memberUids: arrayUnion(uid) }).then(
        () => true,
        (err) => {
          if (err?.code === 'permission-denied') return false
          throw err
        },
      )
      if (!joined) {
        console.log('  no such trip, or it is already deleted — nothing to do')
        continue
      }
      console.log('  self-joined')
      tripSnap = await getDoc(tripRef)
    }

    if (!tripSnap.exists()) {
      console.log('  trip already gone')
      if (confirm && codeSnap) await deleteDoc(codeSnap.ref)
      continue
    }

    const trip = tripSnap.data()
    console.log(`  name    : ${trip.name}`)
    console.log(`  members : ${(trip.memberUids || []).length} device(s)`)

    // Refuse to destroy something that is not what the caller described, and
    // hand back the membership we just took so the trip is left as we found it.
    if (expect && !String(trip.name || '').includes(expect)) {
      console.log(`  ABORTED — name does not contain "${expect}". Nothing deleted.`)
      await updateDoc(tripRef, { memberUids: arrayRemove(uid) })
      console.log('  self-join undone')
      failures++
      continue
    }

    // Photos first: their rule reads the parent trip's memberUids, so they
    // become unreachable the moment the trip document goes.
    const photos = await getDocs(collection(db, 'trips', tripId, 'photos'))
    console.log(`  photos  : ${photos.size}`)
    if (!confirm) {
      console.log('  would delete photos + trip + join code')
      continue
    }
    for (const p of photos.docs) await deleteDoc(p.ref)

    // Join code before the trip: deleting it requires reading the trip. When
    // targeting by id we only learn the code from the trip document itself.
    const codeRef = codeSnap ? codeSnap.ref : trip.joinCode ? doc(db, 'joinCodes', String(trip.joinCode).toUpperCase()) : null
    if (codeRef) await deleteDoc(codeRef).catch(() => console.log('  (join code already absent)'))
    await deleteDoc(tripRef)
    console.log('  DELETED')
  } catch (err) {
    failures++
    console.error(`  FAILED: ${err?.code || ''} ${err?.message || err}`)
  }
}

console.log('')
if (!confirm) console.log('Dry run only. Re-run with --confirm to delete for real.')
process.exit(failures ? 1 : 0)
