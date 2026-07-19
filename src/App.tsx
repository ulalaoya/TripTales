import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useStore } from './store/useStore'
import { BottomNav } from './components/BottomNav'
import { Toast } from './components/Toast'
import { Welcome } from './screens/Welcome'
import { NewTraveller } from './screens/NewTraveller'
import { Home } from './screens/Home'
import { Dashboard } from './screens/Dashboard'
import { TripView } from './screens/TripView'
import { DayView } from './screens/DayView'
import { TripForm } from './screens/TripForm'
import { Checklist } from './screens/Checklist'
import { Album } from './screens/Album'
import { Favourites } from './screens/Favourites'
import { Moment } from './screens/Moment'
import { Family } from './screens/Family'
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

/** Authenticated shell: content column + bottom nav + toast. */
function AppShell() {
  return (
    <div className="max-w-column mx-auto min-h-full bg-[var(--paper-cream)] flex flex-col shadow-2xl">
      <div className="flex-1">
        <Outlet />
      </div>
      <BottomNav />
      <Toast />
    </div>
  )
}

export default function App() {
  useHtmlDir()
  const currentUserId = useStore((s) => s.currentUserId)

  // basename נגזר מ-base של Vite כדי שהראוטר יעבוד גם תחת /triptales/ ב-GitHub Pages
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {!currentUserId ? (
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/join" element={<NewTraveller />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/home" element={<Home />} />
            <Route path="/trips" element={<Dashboard />} />
            <Route path="/trips/new" element={<TripForm />} />
            <Route path="/trips/:tripId" element={<TripView />} />
            <Route path="/trips/:tripId/edit" element={<TripForm />} />
            <Route path="/trips/:tripId/checklist" element={<Checklist />} />
            <Route path="/trips/:tripId/day/:dayId" element={<DayView />} />
            <Route path="/album" element={<Album />} />
            <Route path="/favourites" element={<Favourites />} />
            <Route path="/moment" element={<Moment />} />
            <Route path="/family" element={<Family />} />
            {/* /profile now redirects to Family; the editor lives at /profile/edit */}
            <Route path="/profile" element={<Navigate to="/family" replace />} />
            <Route path="/profile/edit" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  )
}
