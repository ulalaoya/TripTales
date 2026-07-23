import { Component, type ErrorInfo, type ReactNode } from 'react'
import { STRINGS } from '../i18n'
import { useStore } from '../store/useStore'

interface Props {
  children: ReactNode
  /**
   * Called by the "back to trips" recovery button, BEFORE the boundary resets
   * its own error state. Wired to the router's `navigate('/trips')` in `App.tsx`
   * so recovery is a real SPA navigation, not a full reload.
   */
  onReset?: () => void
}

interface BoundaryState {
  error: Error | null
  info: ErrorInfo | null
}

/**
 * App-wide error boundary.
 *
 * Galli reported a "white screen that doesn't respond" when adding a photo on
 * the LIVE (cloud-enabled) site — the classic symptom of an uncaught error
 * during a React render in a production build (no dev overlay). This boundary
 * converts that dead end into a recoverable, DIAGNOSABLE state:
 *
 *   • a friendly RTL recovery screen in the v2 "Coral Journey" tokens,
 *   • two actions — "רענון" (hard reload) and "חזרה לטיולים" (SPA-navigate to
 *     /trips + reset the boundary),
 *   • and — crucially — the real error message + component stack inside a
 *     collapsible "פרטים טכניים", so the next time it happens Galli can
 *     screenshot the actual error and we can pinpoint the root cause.
 *
 * It is a class component (only class components can be error boundaries) so it
 * cannot use the `useT` hook; it reads the active language straight off the
 * store instead. Strings live in BOTH i18n tables like every other string.
 */
export class ErrorBoundary extends Component<Props, BoundaryState> {
  state: BoundaryState = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info })
    // Never swallow silently — surface it to the console for anyone with devtools.
    console.error('[TripTales] Uncaught render error:', error, info)
  }

  private handleReload = (): void => {
    location.reload()
  }

  private handleHome = (): void => {
    // Reset first so the (now navigated) children re-mount cleanly.
    this.setState({ error: null, info: null })
    this.props.onReset?.()
  }

  render(): ReactNode {
    const { error, info } = this.state
    if (!error) return this.props.children

    // Read language WITHOUT subscribing (class component). Falls back to Hebrew.
    const lang = useStore.getState().lang ?? 'he'
    const s = STRINGS[lang]
    const rtl = lang === 'he'

    const stack = [error.message, error.stack, info?.componentStack]
      .filter(Boolean)
      .join('\n\n')

    return (
      <div
        dir={rtl ? 'rtl' : 'ltr'}
        className="paper min-h-full grid place-items-center px-5 py-10"
      >
        <div className="journal-lined w-full max-w-column p-6 text-center space-y-4">
          <div
            aria-hidden
            className="mx-auto grid place-items-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              color: '#fff',
              background: 'linear-gradient(145deg, var(--coral), #ff8b72)',
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            !
          </div>

          <div>
            <h1 className="font-display text-2xl mb-1">{s.errBoundaryTitle}</h1>
            <p className="text-sm text-[var(--muted)]">{s.errBoundaryBody}</p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="primary-btn tap w-full py-3 text-lg"
            >
              {s.errBoundaryReload}
            </button>
            <button
              type="button"
              onClick={this.handleHome}
              className="secondary-btn tap w-full py-3 text-lg"
            >
              {s.errBoundaryHome}
            </button>
          </div>

          {/* The actual error — collapsed by default, expandable for a screenshot. */}
          <details className="text-start rounded-[14px] border border-[var(--line)] bg-white p-3">
            <summary className="tap cursor-pointer text-sm font-semibold text-[var(--ink)]">
              {s.errBoundaryDetails}
            </summary>
            <pre
              dir="ltr"
              className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-snug text-[var(--muted)]"
              style={{ maxHeight: 260, overflow: 'auto' }}
            >
              {stack}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
