import { describe, it, expect } from 'vitest';
import { sortActivitiesByTime } from '../sortActivities';
import type { Activity } from '../../types';

const a = (id: string, time?: string): Activity => ({ id, title: 'פעילות ' + id, time });
const ids = (list: Activity[]) => list.map((x) => x.id);

describe('sortActivitiesByTime', () => {
  it('sorts timed activities ascending', () => {
    const list = [a('c', '19:30'), a('a', '08:00'), a('b', '13:15')];
    expect(ids(sortActivitiesByTime(list))).toEqual(['a', 'b', 'c']);
  });

  it('puts untimed activities after timed ones', () => {
    const list = [a('x'), a('t', '09:00')];
    expect(ids(sortActivitiesByTime(list))).toEqual(['t', 'x']);
  });

  it('keeps untimed activities in their original relative order (stable)', () => {
    const list = [a('x'), a('y'), a('t', '09:00'), a('z')];
    expect(ids(sortActivitiesByTime(list))).toEqual(['t', 'x', 'y', 'z']);
  });

  it('keeps equal times in their original relative order (stable)', () => {
    const list = [a('first', '10:00'), a('second', '10:00')];
    expect(ids(sortActivitiesByTime(list))).toEqual(['first', 'second']);
  });

  it('compares by clock value, not string length', () => {
    const list = [a('late', '09:45'), a('early', '09:05')];
    expect(ids(sortActivitiesByTime(list))).toEqual(['early', 'late']);
  });

  it('sorts across the whole day correctly', () => {
    const list = [a('night', '23:00'), a('noon', '12:00'), a('dawn', '06:30')];
    expect(ids(sortActivitiesByTime(list))).toEqual(['dawn', 'noon', 'night']);
  });

  it('is immutable (input untouched)', () => {
    const list = [a('b', '10:00'), a('a', '08:00')];
    const snapshot = JSON.parse(JSON.stringify(list));
    sortActivitiesByTime(list);
    expect(list).toEqual(snapshot);
  });

  it('empty list → empty list', () => {
    expect(sortActivitiesByTime([])).toEqual([]);
  });
});
