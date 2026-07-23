import { describe, it, expect } from 'vitest';
import { remapMemberId, type IdentityState } from '../memberIdentity';
import type { Member } from '../../types';

const member = (id: string, name = id): Member =>
  ({ id, phone: '', name, role: 'מבוגר', figure: 'person', color: 'x' }) as Member;

const state = (members: Member[], currentUserId: string | null, trips: IdentityState['trips'] = []): IdentityState =>
  ({ members, trips, currentUserId });

describe('remapMemberId — normal remap', () => {
  it('renames the member id and updates currentUserId', () => {
    const out = remapMemberId(state([member('m-old')], 'm-old'), 'm-old', 'm-new');
    expect(out.members.map((m) => m.id)).toEqual(['m-new']);
    expect(out.currentUserId).toBe('m-new');
  });

  it('merges away a duplicate when the target id already exists', () => {
    const out = remapMemberId(state([member('m-old'), member('m-new')], 'm-old'), 'm-old', 'm-new');
    expect(out.members.map((m) => m.id)).toEqual(['m-new']);
    expect(out.currentUserId).toBe('m-new');
  });

  it('no-ops when from === to', () => {
    const s = state([member('m1')], 'm1');
    expect(remapMemberId(s, 'm1', 'm1')).toBe(s);
  });
});

describe('remapMemberId — SAFETY NET (the white-screen root cause)', () => {
  it('never points currentUserId at a member that does not exist', () => {
    // fromId has NO member (already merged away by a prior race), but is the
    // current user. The old code set currentUserId = toId with no such member.
    const out = remapMemberId(state([member('m-real')], 'm-ghost'), 'm-ghost', 'm-also-ghost');
    expect(out.currentUserId).not.toBe('m-also-ghost');
    // it must resolve to a REAL member (or null if truly none exist)
    expect(out.members.some((m) => m.id === out.currentUserId)).toBe(true);
  });

  it('falls back to the original current user when the remap target is absent', () => {
    const out = remapMemberId(state([member('m-me'), member('m-real')], 'm-me'), 'm-gone', 'm-nowhere');
    // m-me wasn't the fromId, so currentUserId stays m-me — and m-me exists
    expect(out.currentUserId).toBe('m-me');
  });

  it('resolves currentUserId to an existing member after every remap', () => {
    const out = remapMemberId(state([member('a'), member('b')], 'a'), 'a', 'b');
    expect(out.members.some((m) => m.id === out.currentUserId)).toBe(true);
  });
});
