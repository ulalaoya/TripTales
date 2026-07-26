import { useT } from '../i18n/useT'

/**
 * The build stamp (date + commit) injected at compile time by `vite.config.ts`.
 *
 * It exists so "is this device running the new version, or a cached one?" can be
 * answered at a glance instead of guessed at. Shown on the trips home AND inside
 * a trip's settings, because the home screen alone proved easy to miss.
 */
export function BuildStamp() {
  const t = useT()
  return (
    <p className="text-center text-[12px] text-[var(--muted)]">
      <bdi>
        {t('versionLabel')} {__APP_BUILT_AT__} · {__APP_COMMIT__}
      </bdi>
    </p>
  )
}
