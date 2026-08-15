import { describe, it, expect, beforeEach, vi } from 'vitest'

// An in-memory stand-in for the IndexedDB-backed store, so the backup layer can
// be exercised without a browser.
const mem = new Map<string, string>()
let frozen = false
vi.mock('../idbStorage', () => ({
  freezePersistence: () => void (frozen = true),
  rawSetItem: async (k: string, v: string) => void mem.set(k, v),
  idbStorage: {
    getItem: async (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: async (k: string, v: string) => {
      if (frozen) return
      mem.set(k, v)
    },
    removeItem: async (k: string) => void mem.delete(k),
    keys: async () => [...mem.keys()],
  },
}))

/** Stand-in for Zustand's `persist` writing the still-hydrated store back out. */
async function livePersistWrite(value: string) {
  const { idbStorage } = await import('../idbStorage')
  await idbStorage.setItem('triptales-store', value)
}

const {
  MAX_SNAPSHOTS,
  STORE_KEY,
  describeState,
  exportFileName,
  importStateJson,
  listSnapshots,
  looksLikeState,
  snapshotBeforeSync,
} = await import('../localBackup')

/** A persisted-state JSON with `trips` days/activities/photos of the given counts. */
function stateJson(tripNames: string[], activities = 1, photos = 0): string {
  return JSON.stringify({
    version: 7,
    state: {
      trips: tripNames.map((name, i) => ({
        id: `t-${i}`,
        name,
        days: [
          {
            id: `d-${i}`,
            activities: Array.from({ length: activities }, (_, a) => ({ id: `a${a}` })),
            photos: Array.from({ length: photos }, (_, p) => ({ id: `p${p}` })),
          },
        ],
      })),
    },
  })
}

beforeEach(() => {
  mem.clear()
  frozen = false
})

describe('looksLikeState', () => {
  it('accepts a persisted store', () => {
    expect(looksLikeState(stateJson(['א']))).toBe(true)
  })

  it('rejects unrelated or malformed JSON', () => {
    expect(looksLikeState('not json')).toBe(false)
    expect(looksLikeState('{"hello":1}')).toBe(false)
    expect(looksLikeState(JSON.stringify({ state: {} }))).toBe(false)
  })
})

describe('describeState', () => {
  it('counts trips, days, activities and photos', () => {
    expect(describeState(stateJson(['א', 'ב'], 3, 2))).toEqual({
      trips: 2,
      days: 2,
      activities: 6,
      photos: 4,
    })
  })

  it('returns null for a file it cannot read', () => {
    expect(describeState('nope')).toBeNull()
  })
})

describe('exportFileName', () => {
  it('is sortable and carries the date and time', () => {
    expect(exportFileName(new Date(2026, 7, 14, 22, 3))).toBe('triptales-2026-08-14-2203.json')
  })
})

describe('snapshotBeforeSync', () => {
  it('does nothing when there is no persisted state', async () => {
    expect(await snapshotBeforeSync()).toBeNull()
    expect(await listSnapshots()).toEqual([])
  })

  it('copies the persisted state aside', async () => {
    mem.set(STORE_KEY, stateJson(['גליל']))
    const key = await snapshotBeforeSync(1000)

    expect(key).toBe('triptales-backup:1000')
    const snaps = await listSnapshots()
    expect(snaps).toHaveLength(1)
    expect(snaps[0].at).toBe(1000)
    expect(mem.get(key!)).toBe(mem.get(STORE_KEY))
  })

  it('skips a snapshot when nothing changed since the last one', async () => {
    mem.set(STORE_KEY, stateJson(['גליל']))
    await snapshotBeforeSync(1000)

    expect(await snapshotBeforeSync(2000)).toBeNull()
    expect(await listSnapshots()).toHaveLength(1)
  })

  it('takes a new snapshot once the state differs', async () => {
    mem.set(STORE_KEY, stateJson(['גליל']))
    await snapshotBeforeSync(1000)
    mem.set(STORE_KEY, stateJson(['גליל', 'עכו']))
    await snapshotBeforeSync(2000)

    const snaps = await listSnapshots()
    expect(snaps.map((s) => s.at)).toEqual([2000, 1000]) // newest first
  })

  it(`keeps at most ${MAX_SNAPSHOTS}, dropping the oldest`, async () => {
    for (let i = 1; i <= MAX_SNAPSHOTS + 3; i++) {
      mem.set(STORE_KEY, stateJson(Array.from({ length: i }, (_, n) => `t${n}`)))
      await snapshotBeforeSync(i * 1000)
    }

    const snaps = await listSnapshots()
    expect(snaps).toHaveLength(MAX_SNAPSHOTS)
    expect(snaps[0].at).toBe((MAX_SNAPSHOTS + 3) * 1000)
    // The three oldest are gone.
    expect(snaps.some((s) => s.at <= 3000)).toBe(false)
  })
})

describe('importStateJson', () => {
  it('refuses a file that is not a TripTales backup', async () => {
    mem.set(STORE_KEY, stateJson(['גליל']))
    expect(await importStateJson('{"nope":true}')).toBe(false)
    expect(mem.get(STORE_KEY)).toBe(stateJson(['גליל']))
  })

  it('replaces the state and keeps the pre-import copy', async () => {
    const before = stateJson(['ישן'])
    const incoming = stateJson(['משוחזר'], 23)
    mem.set(STORE_KEY, before)

    expect(await importStateJson(incoming)).toBe(true)
    expect(mem.get(STORE_KEY)).toBe(incoming)

    // The overwritten state is still recoverable — an import is itself undoable.
    const snaps = await listSnapshots()
    expect(snaps).toHaveLength(1)
    expect(mem.get(snaps[0].key)).toBe(before)
  })

  // REGRESSION. Found in a browser, not here: the restore appeared to succeed
  // and then silently did nothing, because the still-hydrated store wrote its
  // pre-restore copy back on the next state change. Freezing persistence is the
  // only thing standing between a restore and that race.
  it('survives the live store writing its stale copy back afterwards', async () => {
    const before = stateJson(['ישן'])
    const incoming = stateJson(['משוחזר'], 23)
    mem.set(STORE_KEY, before)

    expect(await importStateJson(incoming)).toBe(true)
    await livePersistWrite(before)

    expect(mem.get(STORE_KEY)).toBe(incoming)
  })
})
