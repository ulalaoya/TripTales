/// <reference types="vite/client" />

/**
 * Firebase web config, injected at build time.
 *
 * ALL SIX are optional: when `VITE_FIREBASE_API_KEY` or `VITE_FIREBASE_PROJECT_ID`
 * is missing the app runs in pure LOCAL mode (localStorage only) and no firebase
 * code is ever loaded. See `src/lib/firebase.ts`.
 *
 * These values are PUBLIC by design — they ship inside the client bundle.
 * Security comes from the Firestore rules (`firestore.rules`), not from secrecy.
 */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
