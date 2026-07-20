import { describe, it, expect } from 'vitest';
import { isTripMember, canPlanTrip, canApprovePhotos, canJoinWithCode } from '../tripPermissions';

const trip = { id: 't1', members: ['m-dad', 'm-kid'], joinCode: 'ABC234' } as never;
const dad = { id: 'm-dad', role: 'מבוגר' } as never;
const kid = { id: 'm-kid', role: 'ילד' } as never;
const strangerAdult = { id: 'm-aunt', role: 'מבוגר' } as never;

describe('isTripMember', () => {
  it('member → true', () => expect(isTripMember(trip, 'm-dad')).toBe(true));
  it('non-member → false', () => expect(isTripMember(trip, 'm-aunt')).toBe(false));
});

describe('canPlanTrip', () => {
  it('adult member can plan', () => expect(canPlanTrip(trip, dad)).toBe(true));
  it('child member cannot plan', () => expect(canPlanTrip(trip, kid)).toBe(false));
  it('adult NON-member cannot plan', () => expect(canPlanTrip(trip, strangerAdult)).toBe(false));
});

describe('canApprovePhotos', () => {
  it('adult member can approve', () => expect(canApprovePhotos(trip, dad)).toBe(true));
  it('child member cannot approve', () => expect(canApprovePhotos(trip, kid)).toBe(false));
  it('adult non-member cannot approve', () => expect(canApprovePhotos(trip, strangerAdult)).toBe(false));
});

describe('canJoinWithCode', () => {
  it('exact code matches', () => expect(canJoinWithCode(trip, 'ABC234')).toBe(true));
  it('messy input normalizes and matches', () =>
    expect(canJoinWithCode(trip, ' abc-234 ')).toBe(true));
  it('wrong code rejected', () => expect(canJoinWithCode(trip, 'XYZ999')).toBe(false));
});
