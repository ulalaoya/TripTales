/**
 * IndexedDB-backed key/value storage for the Zustand `persist` middleware.
 *
 * WHY: photos are stored as base64 data URLs inside the persisted store. The
 * previous backend was `localStorage`, which caps at ~5 MB — a week of family
 * photos blows straight past it, and because `localStorage.setItem` is
 * SYNCHRONOUS it threw `QuotaExceededError` in the middle of a React state
 * update (even a harmless `setActiveDay`), crashing the whole app to a white
 * screen. IndexedDB has a far larger quota (hundreds of MB) AND is async, so a
 * write can never throw synchronously into a render.
 *
 * No external deps — a tiny hand-rolled wrapper over one object store.
 */

const DB_NAME = 'triptales'
const STORE = 'kv'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = fn(tx.objectStore(STORE))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
        tx.oncomplete = () => db.close()
      }),
  )
}

export const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const v = await run<string | undefined>('readonly', (s) => s.get(name))
      if (v != null) return v
    } catch {
      /* fall through to the legacy localStorage migration */
    }
    // One-time migration: an existing user's data still lives in localStorage.
    // Read it once, hand it to persist to hydrate, and clear it so the old ~5 MB
    // quota (and its QuotaExceededError) is gone for good — new writes go to IDB.
    try {
      const legacy = localStorage.getItem(name)
      if (legacy != null) {
        localStorage.removeItem(name)
        return legacy
      }
    } catch {
      /* ignore */
    }
    return null
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await run('readwrite', (s) => s.put(value, name))
    } catch (err) {
      // Never let a storage failure bubble into a render — the in-memory store
      // is still correct, we just couldn't persist this write.
      console.error('[TripTales] idb setItem failed:', err)
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await run('readwrite', (s) => s.delete(name))
    } catch {
      /* ignore */
    }
  },
}
