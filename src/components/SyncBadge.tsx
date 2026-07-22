/**
 * The cloud sync indicator in the trips header.
 *
 * Renders NOTHING AT ALL in local mode (`isCloudEnabled === false`) — no
 * placeholder, no reserved space, no `aria-live` region. It is purely
 * informational (not interactive), so it needs no `.tap` target.
 */

import { useStore } from '../store/useStore'
import { useT } from '../i18n/useT'
import { isCloudEnabled } from '../lib/firebase'
import { syncLabel } from '../lib/syncState'
import { Icon } from './Icon'

export function SyncBadge() {
  const t = useT()
  const state = useStore((s) => s.syncState)

  if (!isCloudEnabled || state === 'off') return null

  const offline = state === 'offline'
  const busy = state === 'syncing' || state === 'connecting'
  const label = syncLabel(state, t.lang)

  return (
    <span
      role="status"
      aria-live="polite"
      title={t('syncTitle')}
      className="tag inline-flex items-center gap-1 px-2 py-1 text-[11px] leading-none select-none"
      style={{
        color: offline ? 'var(--muted)' : 'var(--sea)',
        background: offline ? 'var(--canvas)' : 'var(--sea-soft)',
        opacity: busy ? 0.75 : 1,
        transition: 'opacity .2s ease',
      }}
    >
      <Icon name={offline ? 'cloudOff' : 'cloud'} size={14} />
      {label}
    </span>
  )
}
