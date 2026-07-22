/**
 * The cloud sync indicator's state machine (PURE type + label helper).
 *
 *   'off'        — cloud mode is disabled (no firebase config). The indicator
 *                  renders NOTHING at all; the app is pure local.
 *   'connecting' — signing in anonymously / opening the first snapshot.
 *   'synced'     — connected, everything written.
 *   'syncing'    — a write is in flight.
 *   'offline'    — the last cloud operation failed; local edits keep working
 *                  and will be pushed on the next successful connection.
 */
export type SyncState = 'off' | 'connecting' | 'synced' | 'syncing' | 'offline'

import type { Lang } from '../i18n'
import { STRINGS } from '../i18n'

/** i18n label for a sync state (both tables carry all four visible states). */
export function syncLabel(state: SyncState, lang: Lang): string {
  const t = STRINGS[lang]
  switch (state) {
    case 'connecting':
      return t.syncConnecting
    case 'synced':
      return t.syncSynced
    case 'syncing':
      return t.syncSyncing
    case 'offline':
      return t.syncOffline
    default:
      return ''
  }
}
