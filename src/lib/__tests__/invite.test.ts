import { describe, it, expect } from 'vitest';
import { buildInviteText } from '../invite';

const trip = {
  id: 't1',
  name: 'טיול לגליל',
  destination: 'הגליל העליון',
  startDate: '2026-08-02',
  endDate: '2026-08-06',
  transport: 'drive',
} as never;

describe('buildInviteText — Hebrew', () => {
  const text = buildInviteText(trip, 'he');
  it('contains the trip name', () => expect(text).toContain('טיול לגליל'));
  it('contains both dates (any readable format)', () => {
    expect(text).toMatch(/2026|02\/08|2\.8|באוגוסט/);
  });
  it('mentions signing in with a phone number', () =>
    expect(text).toMatch(/טלפון/));
  it('explains the roles (adults edit; kids upload for approval + react)', () => {
    expect(text).toMatch(/מבוגר|הורים/);
    expect(text).toMatch(/ילד/);
    expect(text).toMatch(/אישור/);
  });
});

describe('buildInviteText — English', () => {
  const text = buildInviteText(trip, 'en');
  it('contains the trip name', () => expect(text).toContain('טיול לגליל'));
  it('mentions phone sign-in', () => expect(text.toLowerCase()).toContain('phone'));
  it('explains the roles', () => {
    const t = text.toLowerCase();
    expect(t).toMatch(/adult|parent/);
    expect(t).toMatch(/kid|child/);
    expect(t).toMatch(/approv/);
  });
});
