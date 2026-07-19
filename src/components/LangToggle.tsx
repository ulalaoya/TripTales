import { useStore } from '../store/useStore'
import { STRINGS } from '../i18n'

/** Live he<->en switch. Flips dir+lang on <html> (handled by the effect in App). */
export function LangToggle({ dark = false }: { dark?: boolean }) {
  const lang = useStore((s) => s.lang)
  const setLang = useStore((s) => s.setLang)
  const next = lang === 'he' ? 'en' : 'he'
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      className={`tap px-3 py-1.5 rounded-full text-sm font-semibold border bg-white ${
        dark
          ? 'text-[var(--coral)] border-[var(--line)]'
          : 'text-[var(--ink)] border-[var(--line)]'
      }`}
      aria-label={STRINGS[lang].switchLang}
    >
      {STRINGS[lang].switchLang}
    </button>
  )
}
