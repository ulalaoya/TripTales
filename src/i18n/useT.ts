import { STRINGS } from './index'
import type { StringKey } from './index'
import { useStore } from '../store/useStore'

/** Returns a translator bound to the current language. */
export function useT() {
  const lang = useStore((s) => s.lang)
  const table = STRINGS[lang]
  function t(key: StringKey): string {
    const v = table[key]
    return typeof v === 'string' ? v : String(v)
  }
  // For the couple of function-valued strings (counts).
  t.fn = <K extends StringKey>(key: K): (typeof table)[K] => table[key]
  t.lang = lang
  return t
}
