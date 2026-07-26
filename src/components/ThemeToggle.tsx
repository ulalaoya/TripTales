import { useStore } from '../store/useStore'
import { useT } from '../i18n/useT'
import { Icon } from './Icon'

/**
 * Day / night mode switch (Galli feedback). The choice is persisted with the
 * rest of the store and applied as `<html data-theme>` — see `App.tsx`.
 *
 * Only the neutral tokens change at night; a trip's chosen palette keeps its
 * accent colours, so night mode and palettes compose rather than conflict.
 */
export function ThemeToggle() {
  const t = useT()
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={dark}
      aria-label={dark ? t('lightMode') : t('darkMode')}
      title={dark ? t('lightMode') : t('darkMode')}
      className="tap p-2 rounded-full text-[var(--ink)]"
    >
      <Icon name={dark ? 'sun' : 'moon'} size={20} />
    </button>
  )
}
