import { describe, it, expect } from 'vitest';
import { tripToDoc, photosOfTrip, docToTrip } from '../firestoreMap';
import type { Trip } from '../../types';

const trip = (): Trip =>
  ({
    id: 't1',
    name: 'אוגוסט בגליל',
    startDate: '2026-08-10',
    endDate: '2026-08-11',
    transport: 'drive',
    order: 1,
    members: ['m-parent', 'm-child'],
    joinCode: 'SUNSET',
    checklist: [
      { id: 'g1', name: 'בגדים', emoji: '👕', items: [{ id: 'i1', label: 'כובע', owner: 'all', done: false }] },
    ],
    days: [
      {
        id: 'd1',
        date: '2026-08-10',
        title: 'יום ההגעה',
        activities: [{ id: 'a1', title: 'מדעטק', time: '10:00', icon: '🧪', loc: 'מדעטק חיפה' }],
        entries: [],
        photos: [
          { id: 'p1', svg: '<svg/>', caption: 'בדרך', fav: true, by: 'm-parent', status: 'approved', reacts: {} },
          { id: 'p2', svg: '<svg/>', caption: 'ממתינה', fav: false, by: 'm-child', status: 'pending', reacts: {} },
        ],
      },
      { id: 'd2', date: '2026-08-11', title: '', activities: [], entries: [], photos: [] },
    ],
  }) as unknown as Trip;

describe('tripToDoc', () => {
  it('strips photos out of every day', () => {
    const doc = tripToDoc(trip(), []) as { days: Array<Record<string, unknown>> };
    for (const d of doc.days) expect(d).not.toHaveProperty('photos');
  });

  it('carries memberUids through', () => {
    const doc = tripToDoc(trip(), ['uid-a', 'uid-b']) as { memberUids: string[] };
    expect(doc.memberUids).toEqual(['uid-a', 'uid-b']);
  });

  it('never emits undefined values (Firestore rejects them)', () => {
    const t = trip();
    (t as unknown as { destination?: string }).destination = undefined;
    const seen: unknown[] = [];
    const walk = (v: unknown) => {
      seen.push(v);
      if (v && typeof v === 'object') Object.values(v as object).forEach(walk);
    };
    walk(tripToDoc(t, []));
    expect(seen.some((v) => v === undefined)).toBe(false);
  });

  it('does not mutate the input trip', () => {
    const t = trip();
    const snapshot = JSON.parse(JSON.stringify(t));
    tripToDoc(t, ['uid-a']);
    expect(t).toEqual(snapshot);
  });
});

describe('photosOfTrip', () => {
  it('flattens photos across days, tagged with their dayId', () => {
    const photos = photosOfTrip(trip());
    expect(photos).toHaveLength(2);
    expect(photos.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(photos.every((p) => p.dayId === 'd1')).toBe(true);
  });

  it('a trip with no photos yields an empty list', () => {
    const t = trip();
    t.days.forEach((d) => (d.photos = []));
    expect(photosOfTrip(t)).toEqual([]);
  });
});

describe('docToTrip', () => {
  it('re-nests photos into their day', () => {
    const t = trip();
    const rebuilt = docToTrip(tripToDoc(t, []), photosOfTrip(t));
    expect(rebuilt.days[0].photos.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('restores an empty photos array on days that have none', () => {
    const t = trip();
    const rebuilt = docToTrip(tripToDoc(t, []), photosOfTrip(t));
    expect(rebuilt.days[1].photos).toEqual([]);
  });

  it('drops photos whose day no longer exists', () => {
    const t = trip();
    const orphan = [...photosOfTrip(t), { id: 'p9', dayId: 'gone', caption: 'יתומה' }];
    const rebuilt = docToTrip(tripToDoc(t, []), orphan as never);
    const allIds = rebuilt.days.flatMap((d) => d.photos.map((p) => p.id));
    expect(allIds).not.toContain('p9');
  });

  it('ROUND TRIP: doc -> trip reproduces the original exactly', () => {
    const t = trip();
    expect(docToTrip(tripToDoc(t, ['uid-a']), photosOfTrip(t))).toStrictEqual(t);
  });
});
