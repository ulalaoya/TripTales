import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useNavigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import { cloudSignIn, cloudStop } from './lib/cloud'
import { ErrorBoundary } from './components/ErrorBoundary'
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

/** Sync <html dir/lang> with the current language (live he<->en switch). */
function useHtmlDir() {
  const lang = useStore((s) => s.lang)
  useEffect(() => {
    const el = document.documentElement
    el.lang = lang
    el.dir = lang === 'he' ? 'rtl' : 'ltr'
  }, [lang])
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
    if (currentUserId) void cloudSignIn()
    else cloudStop()
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
  const currentUserId = useStore((s) => s.currentUserId)
  useCloudSession(currentUserId)

  // basename נגזר מ-base של Vite כדי שהראוטר יעבוד גם תחת /TripTales/ ב-GitHub Pages
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppRoutes />
    </BrowserRouter>
  )
}
