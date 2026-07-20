import { describe, it, expect } from 'vitest';
import { reorderActivities, moveActivityToDay } from '../activities';
import type { Activity, Day } from '../../types';

const act = (id: string): Activity => ({ id, title: 'פעילות ' + id });
const day = (id: string, acts: string[]): Day =>
  ({ id, date: '2026-08-02', activities: acts.map(act) } as unknown as Day);

const ids = (list: Activity[]) => list.map((a) => a.id);

describe('reorderActivities', () => {
  const list = [act('a'), act('b'), act('c'), act('d')];

  it('moves an item forward', () => {
    expect(ids(reorderActivities(list, 0, 2))).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item backward', () => {
    expect(ids(reorderActivities(list, 3, 0))).toEqual(['d', 'a', 'b', 'c']);
  });

  it('same index → same order', () => {
    expect(ids(reorderActivities(list, 1, 1))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('is immutable (input untouched)', () => {
    const snapshot = JSON.parse(JSON.stringify(list));
    reorderActivities(list, 0, 3);
    expect(list).toEqual(snapshot);
  });
});

describe('moveActivityToDay', () => {
  const days = [day('d1', ['a', 'b']), day('d2', ['x'])];

  it('moves an activity to another day at the given index', () => {
    const out = moveActivityToDay(days, 'd1', 'd2', 'a', 1);
    expect(ids(out.find((d) => d.id === 'd1')!.activities)).toEqual(['b']);
    expect(ids(out.find((d) => d.id === 'd2')!.activities)).toEqual(['x', 'a']);
  });

  it('moves to the start of the target day', () => {
    const out = moveActivityToDay(days, 'd1', 'd2', 'b', 0);
    expect(ids(out.find((d) => d.id === 'd2')!.activities)).toEqual(['b', 'x']);
  });

  it('invalid activity id → same content', () => {
    const out = moveActivityToDay(days, 'd1', 'd2', 'nope', 0);
    expect(JSON.parse(JSON.stringify(out))).toEqual(JSON.parse(JSON.stringify(days)));
  });

  it('invalid day id → same content', () => {
    const out = moveActivityToDay(days, 'd1', 'nope', 'a', 0);
    expect(JSON.parse(JSON.stringify(out))).toEqual(JSON.parse(JSON.stringify(days)));
  });

  it('is immutable (input untouched)', () => {
    const snapshot = JSON.parse(JSON.stringify(days));
    moveActivityToDay(days, 'd1', 'd2', 'a', 0);
    expect(days).toEqual(snapshot);
  });
});
