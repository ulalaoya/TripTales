import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export function Toast() {
  const toast = useStore((s) => s.toast)
  const clear = useStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(clear, 2600)
    return () => clearTimeout(id)
  }, [toast, clear])

  if (!toast) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 top-4 z-50 max-w-[90%]"
    >
      <div className="luggage-tag px-4 py-2 text-sm font-semibold text-center">{toast}</div>
    </div>
  )
}
