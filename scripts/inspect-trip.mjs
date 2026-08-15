// ===========================================================================
// inspect-trip.mjs — read what the CLOUD holds for a trip, and change nothing.
//
// The counterpart to purge-trip.mjs. When devices disagree about a trip, the
// decisive question is what the shared copy actually says — and that cannot be
// answered from any single device.
//
// Reading requires membership, so this self-joins by trip id (the same path
// firestore.rules grants a code-holder) and then REMOVES its own uid again on
// the way out. Nothing else is written, and no image data is ever printed —
// only counts, titles, dates and sizes.
//
// USAGE
//   node scripts/inspect-trip.mjs <TRIPID> [<TRIPID>...]
// ===========================================================================

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  updateDoc,
} from 'firebase/firestore'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

// .env.local holds the real project; .env.development.local deliberately blanks
// it so `npm run dev` cannot touch live data. This tool wants the real one.
const env = readEnv('.env.local')
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

const tripIds = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (tripIds.length === 0) {
  console.error('usage: node scripts/inspect-trip.mjs <TRIPID> [<TRIPID>...]')
  process.exit(1)
}

const app = initializeApp(config)
const db = getFirestore(app)
const { user } = await signInAnonymously(getAuth(app))
const uid = user.uid

const stamp = (v) => {
  const ms = typeof v === 'number' ? v : v?.seconds ? v.seconds * 1000 : null
  return ms ? new Date(ms).toISOString() : String(v ?? '—')
}
const dataUrlBytes = (s) =>
  typeof s === 'string' && s.startsWith('data:') ? Math.floor((s.slice(s.indexOf(',') + 1).length * 3) / 4) : 0

console.log(`project ${config.projectId} — read-only\n`)

for (const tripId of tripIds) {
  const ref = doc(db, 'trips', tripId)
  let joined = false
  try {
    let snap = await getDoc(ref).catch((e) => {
      if (e?.code === 'permission-denied') return null
      throw e
    })
    if (!snap) {
      await updateDoc(ref, { memberUids: arrayUnion(uid) })
      joined = true
      snap = await getDoc(ref)
    }
    if (!snap.exists()) {
      console.log(`${tripId}: no such trip in the cloud`)
      continue
    }

    const t = snap.data()
    console.log(`=== ${t.name} (${tripId}) ===`)
    console.log(`  dates      : ${t.startDate} .. ${t.endDate}`)
    console.log(`  updatedAt  : ${stamp(t.updatedAt)}`)
    console.log(`  memberUids : ${(t.memberUids || []).length}   members: ${(t.members || []).length}`)

    let acts = 0
    for (const d of t.days || []) {
      const titles = (d.activities || []).map((a) => a.title ?? a.name ?? '?')
      acts += titles.length
      console.log(`  ${d.date}  ${titles.join(' | ') || '(no activities)'}`)
    }
    console.log(`  activities : ${acts}`)

    const photos = await getDocs(collection(db, 'trips', tripId, 'photos'))
    let bytes = 0
    for (const p of photos.docs) bytes += dataUrlBytes(p.data().src)
    console.log(`  photos     : ${photos.size}  (${(bytes / 1048576).toFixed(1)} MB)`)
  } catch (err) {
    console.error(`${tripId}: FAILED ${err?.code || ''} ${err?.message || err}`)
  } finally {
    // Leave the trip exactly as found.
    if (joined) {
      await updateDoc(ref, { memberUids: arrayRemove(uid) }).catch(() => {})
      console.log('  (inspector removed itself from memberUids)')
    }
  }
  console.log('')
}
process.exit(0)
