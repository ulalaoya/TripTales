import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useNavigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import { cloudSignIn, cloudStop } from './lib/cloud'
import { snapshotBeforeSync } from './lib/localBackup'
import { ErrorBoundary } from './components/ErrorBoundary'
import { paletteVars, PALETTE_VAR_NAMES } from './lib/palettes'
import { TripBottomNav } from './components/BottomNav'
import { Toast } from './components/Toast'
import { Welcome } from './screens/Welcome'
import { NewTraveller } from './screens/NewTraveller'
import { Dashboard } from './screens/Dashboard'
import { TripView } from './screens/TripView'
import { TripForm } from './screens/TripForm'
import { Checklist } from './screens/Checklist'
import { Album } from './screens/Album'
import { Moment } from './screens/Moment'
import { People } from './screens/People'
import { Profile } from './screens/Profile'

/** Sync <html dir/lang/data-theme> with the current language and colour scheme. */
function useHtmlDir() {
  const lang = useStore((s) => s.lang)
  const theme = useStore((s) => s.theme)
  useEffect(() => {
    const el = document.documentElement
    el.lang = lang
    el.dir = lang === 'he' ? 'rtl' : 'ltr'
  }, [lang])
  useEffect(() => {
    // Drives the `:root[data-theme='dark']` token block in index.css.
    document.documentElement.dataset.theme = theme
  }, [theme])
}

/**
 * Apply the app-wide palette to `<html>` (Galli feedback: one palette for the
 * WHOLE app, not per trip). Setting it on the root element — rather than on a
 * per-screen wrapper — means it also reaches `body`, the welcome/login screens
 * and every future screen for free.
 */
function useAppPalette() {
  const paletteId = useStore((s) => s.paletteId)
  const dark = useStore((s) => s.theme) === 'dark'
  useEffect(() => {
    const el = document.documentElement
    // Clear the previous palette first, or switching back to the default would
    // leave its custom properties behind.
    for (const name of PALETTE_VAR_NAMES) el.style.removeProperty(name)
    const vars = paletteVars(paletteId, dark) as Record<string, string>
    for (const [name, value] of Object.entries(vars)) el.style.setProperty(name, value)
  }, [paletteId, dark])
}

/** Outer phone-frame column shared by every authenticated screen. */
function Frame() {
  return (
    <div className="max-w-column mx-auto min-h-full bg-[var(--canvas)] flex flex-col shadow-2xl">
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
      <Toast />
    </div>
  )
}

/** Inside-a-trip layout: adds the contextual bottom tab bar. */
function TripLayout() {
  const { tripId } = useParams()
  const trip = useStore((s) => s.trips.find((t) => t.id === tripId))
  if (!trip) return <Navigate to="/trips" replace />
  // The palette is applied app-wide on <html> (see `useAppPalette`).
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <TripBottomNav tripId={trip.id} />
    </div>
  )
}

/**
 * Connect / disconnect cloud sync as the session changes.
 * Both calls are no-ops when Firebase is not configured, so a local-mode build
 * behaves exactly as it did before sync existed.
 */
function useCloudSession(currentUserId: string | null) {
  useEffect(() => {
    if (!currentUserId) {
      cloudStop()
      return
    }
    // ORDER MATTERS. The local state is copied aside BEFORE sync is allowed to
    // run, so a merge that destroys something always leaves the pre-merge copy
    // on the device. A failed snapshot must not block sign-in, hence `finally`.
    void snapshotBeforeSync().finally(() => {
      void cloudSignIn()
    })
  }, [currentUserId])
}

/**
 * The routed tree, wrapped in an ErrorBoundary. Lives INSIDE the router so the
 * boundary's "back to trips" recovery can do a real SPA navigation. Any screen
 * that throws during render is caught here instead of white-screening the app.
 */
function AppRoutes() {
  const navigate = useNavigate()
  const currentUserId = useStore((s) => s.currentUserId)
  return (
    <ErrorBoundary onReset={() => navigate('/trips')}>
      {!currentUserId ? (
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/join" element={<NewTraveller />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route element={<Frame />}>
            {/* Home-level — minimal chrome, NO bottom nav */}
            <Route path="/trips" element={<Dashboard />} />
            <Route path="/trips/new" element={<TripForm />} />
            <Route path="/profile/edit" element={<Profile />} />

            {/* Inside a trip — contextual bottom tab bar */}
            <Route path="/trips/:tripId" element={<TripLayout />}>
              <Route index element={<TripView />} />
              <Route path="album" element={<Album />} />
              <Route path="moment" element={<Moment />} />
              <Route path="checklist" element={<Checklist />} />
              <Route path="people" element={<People />} />
            </Route>

            {/* Removed screens → redirect to the trips home */}
            <Route path="/home" element={<Navigate to="/trips" replace />} />
            <Route path="/family" element={<Navigate to="/trips" replace />} />
            <Route path="/album" element={<Navigate to="/trips" replace />} />
            <Route path="/favourites" element={<Navigate to="/trips" replace />} />
            <Route path="/moment" element={<Navigate to="/trips" replace />} />
            <Route path="/profile" element={<Navigate to="/profile/edit" replace />} />
            <Route path="*" element={<Navigate to="/trips" replace />} />
          </Route>
        </Routes>
      )}
    </ErrorBoundary>
  )
}

export default function App() {
  useHtmlDir()
  useAppPalette()
  const currentUserId = useStore((s) => s.currentUserId)
  const hasHydrated = useStore((s) => s.hasHydrated)
  useCloudSession(currentUserId)

  // The persisted store now loads from IndexedDB (async). Until it has
  // rehydrated, render a blank canvas so a logged-in user never flashes the
  // Welcome screen for a frame.
  if (!hasHydrated) return <div className="paper min-h-full" />

  // basename נגזר מ-base של Vite כדי שהראוטר יעבוד גם תחת /TripTales/ ב-GitHub Pages
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppRoutes />
    </BrowserRouter>
  )
}
