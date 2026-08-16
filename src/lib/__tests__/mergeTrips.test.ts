import { describe, it, expect } from 'vitest'
import { mergeTripContent, mergeTombstones, unionById } from '../mergeTrips'
import type { Activity, Day, Photo, Trip } from '../../types'

const act = (id: string, title = id): Activity => ({ id, title })
const photo = (id: string, updatedAt?: number): Photo =>
  ({ id, src: `data:${id}`, caption: '', by: 'm1', status: 'approved', fav: false, reacts: {}, updatedAt }) as Photo

const day = (id: string, date: string, activities: Activity[] = [], photos: Photo[] = []): Day => ({
  id,
  date,
  title: id,
  activities,
  entries: [],
  photos,
})

const trip = (over: Partial<Trip> = {}): Trip =>
  ({
    id: 't1',
    name: 'גליל',
    startDate: '2026-08-10',
    endDate: '2026-08-11',
    transport: 'car',
    order: 0,
    days: [],
    members: [],
    joinCode: 'ABC123',
    checklist: [],
    ...over,
  }) as Trip

const titlesOn = (t: Trip, dayId: string) =>
  (t.days.find((d) => d.id === dayId)?.activities ?? []).map((a) => a.title)

describe('mergeTombstones', () => {
  it('unions both sides and keeps the later deletion', () => {
    expect(mergeTombstones({ a: 5, b: 1 }, { b: 9, c: 2 })).toEqual({ a: 5, b: 9, c: 2 })
  })

  it('tolerates either side being absent', () => {
    expect(mergeTombstones(undefined, undefined)).toEqual({})
    expect(mergeTombstones({ a: 1 }, undefined)).toEqual({ a: 1 })
  })
})

describe('unionById', () => {
  it('keeps the preferred order and appends what only the other side has', () => {
    const out = unionById([act('a'), act('b')], [act('b'), act('c')])
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('takes the preferred value when both sides carry an id', () => {
    const out = unionById([act('a', 'mine')], [act('a', 'theirs')])
    expect(out).toEqual([act('a', 'mine')])
  })

  it('drops tombstoned ids from BOTH sides', () => {
    const out = unionById([act('a'), act('b')], [act('c')], { b: 1, c: 2 })
    expect(out.map((x) => x.id)).toEqual(['a'])
  })
})

describe('mergeTripContent', () => {
  // THE REGRESSION THAT COST A WEEK OF PLANNING.
  it('an older remote copy can never delete newer local work', () => {
    const local = trip({
      updatedAt: 2000,
      days: [day('d1', '2026-08-10', [act('a1'), act('a2'), act('a3')])],
    })
    const stale = trip({ updatedAt: 1000, days: [day('d1', '2026-08-10', [act('a1')])] })

    expect(titlesOn(mergeTripContent(local, stale), 'd1')).toEqual(['a1', 'a2', 'a3'])
  })

  // ...and the mirror image: a NEWER remote must not delete unpushed local work.
  it('a newer remote copy still keeps local-only activities', () => {
    const local = trip({ updatedAt: 1000, days: [day('d1', '2026-08-10', [act('mine')])] })
    const remote = trip({ updatedAt: 5000, days: [day('d1', '2026-08-10', [act('theirs')])] })

    expect(titlesOn(mergeTripContent(local, remote), 'd1').sort()).toEqual(['mine', 'theirs'])
  })

  it('keeps days that exist on only one side, sorted by date', () => {
    const local = trip({ updatedAt: 1000, days: [day('d2', '2026-08-11')] })
    const remote = trip({ updatedAt: 2000, days: [day('d1', '2026-08-10')] })

    expect(mergeTripContent(local, remote).days.map((d) => d.date)).toEqual(['2026-08-10', '2026-08-11'])
  })

  it('propagates a deliberate delete through its tombstone', () => {
    // Local deleted a1; the remote still has it and must not resurrect it.
    const local = trip({ updatedAt: 2000, days: [day('d1', '2026-08-10', [act('a2')])], deleted: { a1: 1500 } })
    const remote = trip({ updatedAt: 1000, days: [day('d1', '2026-08-10', [act('a1'), act('a2')])] })

    const merged = mergeTripContent(local, remote)
    expect(titlesOn(merged, 'd1')).toEqual(['a2'])
    expect(merged.deleted).toEqual({ a1: 1500 })
  })

  it("honours the other side's tombstone too, even when that side is older", () => {
    const local = trip({ updatedAt: 5000, days: [day('d1', '2026-08-10', [act('a1')])] })
    const remote = trip({ updatedAt: 1000, days: [day('d1', '2026-08-10')], deleted: { a1: 4000 } })

    expect(titlesOn(mergeTripContent(local, remote), 'd1')).toEqual([])
  })

  it('lets the newer side win a conflicting edit to the same activity', () => {
    const local = trip({ updatedAt: 1000, days: [day('d1', '2026-08-10', [act('a1', 'old title')])] })
    const remote = trip({ updatedAt: 9000, days: [day('d1', '2026-08-10', [act('a1', 'new title')])] })

    expect(titlesOn(mergeTripContent(local, remote), 'd1')).toEqual(['new title'])
  })

  it('never drops a photo that has not been uploaded yet', () => {
    // No `updatedAt` => never confirmed by the server => absence upstream means
    // "not uploaded", not "deleted".
    const local = trip({ updatedAt: 1000, days: [day('d1', '2026-08-10', [], [photo('p-local')])] })
    const remote = trip({ updatedAt: 9000, days: [day('d1', '2026-08-10', [], [photo('p-remote', 8000)])] })

    const photos = mergeTripContent(local, remote).days[0].photos.map((p) => p.id)
    expect(photos.sort()).toEqual(['p-local', 'p-remote'])
  })

  it('unions membership from both sides', () => {
    const local = trip({ updatedAt: 1000, members: ['m1'], memberUids: ['u1'] })
    const remote = trip({ updatedAt: 2000, members: ['m2'], memberUids: ['u2'] })

    const merged = mergeTripContent(local, remote)
    expect(merged.members.sort()).toEqual(['m1', 'm2'])
    expect([...(merged.memberUids ?? [])].sort()).toEqual(['u1', 'u2'])
  })

  it('keeps the local ordering and the newest stamp', () => {
    const local = trip({ updatedAt: 1000, order: 7 })
    const remote = trip({ updatedAt: 4000, order: 0 })

    const merged = mergeTripContent(local, remote)
    expect(merged.order).toBe(7)
    expect(merged.updatedAt).toBe(4000)
  })

  it('takes scalar fields from the newer side', () => {
    const local = trip({ updatedAt: 1000, name: 'ישן' })
    const remote = trip({ updatedAt: 2000, name: 'חדש' })

    expect(mergeTripContent(local, remote).name).toBe('חדש')
    expect(mergeTripContent(remote, local).name).toBe('חדש')
  })

  // The exact shape of the real incident: two devices, each holding days and
  // activities the other has never seen, meeting for the first time.
  it('reunites two divergent copies without losing anything', () => {
    const phone = trip({
      updatedAt: 3000,
      days: [
        day('d1', '2026-08-10', [act('מוזיאון המדע'), act('VIVINO')]),
        day('d3', '2026-08-15', [act('בריכה ברקפת')]),
      ],
    })
    const computer = trip({
      updatedAt: 1000,
      days: [
        day('d1', '2026-08-10', [act('מוזיאון המדע'), act('עגלת קפה היידי')]),
        day('d2', '2026-08-12', [act('נחל השופט')]),
      ],
    })

    const merged = mergeTripContent(phone, computer)

    expect(merged.days.map((d) => d.date)).toEqual(['2026-08-10', '2026-08-12', '2026-08-15'])
    expect(titlesOn(merged, 'd1')).toEqual(['מוזיאון המדע', 'VIVINO', 'עגלת קפה היידי'])
    expect(titlesOn(merged, 'd2')).toEqual(['נחל השופט'])
    expect(titlesOn(merged, 'd3')).toEqual(['בריכה ברקפת'])
  })
})
