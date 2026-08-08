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
// It signs in anonymously and self-joins using the trip's 6-character join
// code — exactly the path a cousin who was sent the code would take (see the
// JOIN EXCEPTION in firestore.rules). No admin credentials, no service
// account: if you do not have the code, you cannot purge the trip.
//
// USAGE
//   node scripts/purge-trip.mjs ABC123            # dry run — reports only
//   node scripts/purge-trip.mjs ABC123 --confirm  # actually deletes
//
// Reads the Firebase web config from .env.local (same values the app uses).
// ===========================================================================

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import {
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
const codes = args.filter((a) => !a.startsWith('--')).map((a) => a.trim().toUpperCase())

if (codes.length === 0) {
  console.error('usage: node scripts/purge-trip.mjs <JOINCODE> [<JOINCODE>...] [--confirm]')
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

for (const code of codes) {
  console.log(`── ${code} ──────────────────────────────`)
  try {
    const codeSnap = await getDoc(doc(db, 'joinCodes', code))
    if (!codeSnap.exists()) {
      console.log('  join code not found — nothing to do')
      continue
    }
    const tripId = codeSnap.data().tripId
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
      await updateDoc(tripRef, { memberUids: arrayUnion(uid) })
      console.log('  self-joined')
      tripSnap = await getDoc(tripRef)
    }

    if (!tripSnap.exists()) {
      console.log('  trip already gone; removing the dangling code')
      if (confirm) await deleteDoc(codeSnap.ref)
      continue
    }

    const trip = tripSnap.data()
    console.log(`  name    : ${trip.name}`)
    console.log(`  members : ${(trip.memberUids || []).length} device(s)`)

    // Photos first: their rule reads the parent trip's memberUids, so they
    // become unreachable the moment the trip document goes.
    const photos = await getDocs(collection(db, 'trips', tripId, 'photos'))
    console.log(`  photos  : ${photos.size}`)
    if (!confirm) {
      console.log('  would delete photos + trip + join code')
      continue
    }
    for (const p of photos.docs) await deleteDoc(p.ref)

    // Join code before the trip: deleting it requires reading the trip.
    await deleteDoc(codeSnap.ref)
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
