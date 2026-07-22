/**
 * Firebase configuration + LAZY SDK loading.
 *
 * ── Local mode is the default ───────────────────────────────────────────────
 * When `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_PROJECT_ID` are absent,
 * `isCloudEnabled` is `false`, `getCloudSdk()` returns `null`, and NOTHING from
 * the firebase SDK is ever imported, evaluated or fetched. The app behaves
 * exactly as it did before sync existed: Zustand + localStorage, nothing else.
 *
 * ── Why dynamic import() ────────────────────────────────────────────────────
 * `import('firebase/…')` keeps the whole SDK in its own lazily-fetched chunk,
 * so local-mode users never download a byte of it.
 *
 * ── The config is PUBLIC ────────────────────────────────────────────────────
 * A Firebase web config is not a secret — it ships in every client bundle by
 * design and identifies the project, it does not authorise anything. All access
 * control lives in `firestore.rules`.
 *
 * This module NEVER throws at import time.
 */

import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

type FirestoreModule = typeof import('firebase/firestore')
type AuthModule = typeof import('firebase/auth')

/** The `firebase/firestore` module namespace, once lazily loaded. */
export type FsApi = FirestoreModule
/** The Firestore database handle. */
export type Db = Firestore

function clean(v: string | undefined): string {
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Static member access on `import.meta.env` — required so Vite can inline the
 * values at build time.
 */
export const FIREBASE_CONFIG = {
  apiKey: clean(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: clean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: clean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: clean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(import.meta.env.VITE_FIREBASE_APP_ID),
} as const

/**
 * True only when BOTH the api key and the project id are configured.
 * Everything cloud-related in the app is gated on this single flag.
 */
export const isCloudEnabled: boolean = FIREBASE_CONFIG.apiKey !== '' && FIREBASE_CONFIG.projectId !== ''

/** The lazily-loaded SDK handles, once `getCloudSdk()` has resolved. */
export interface CloudSdk {
  app: FirebaseApp
  auth: Auth
  db: Firestore
  /** The `firebase/firestore` module namespace (doc, setDoc, onSnapshot, …). */
  fs: FirestoreModule
  /** The `firebase/auth` module namespace (signInAnonymously, …). */
  authApi: AuthModule
}

let pending: Promise<CloudSdk> | null = null

/**
 * Initialise (once) and return the SDK handles, or `null` when cloud mode is
 * off. A failed load resets the cache so a later call can retry.
 */
export function getCloudSdk(): Promise<CloudSdk> | null {
  if (!isCloudEnabled) return null
  if (!pending) {
    pending = (async () => {
      const [appApi, authApi, fs] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ])
      const app = appApi.getApps().length ? appApi.getApp() : appApi.initializeApp({ ...FIREBASE_CONFIG })
      return { app, auth: authApi.getAuth(app), db: fs.getFirestore(app), fs, authApi }
    })().catch((err) => {
      pending = null
      throw err
    })
  }
  return pending
}
