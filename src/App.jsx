import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './state/AuthContext.jsx'
import AppShell from './app/AppShell.jsx'
import SignInPage from './features/auth/SignInPage.jsx'
import HomePage from './features/home/HomePage.jsx'
import ListsPage from './features/planning/ListsPage.jsx'
import WeekPage from './features/planning/WeekPage.jsx'
import CalendarPage from './features/planning/CalendarPage.jsx'
import FamilySettingsPage from './features/kids/FamilySettingsPage.jsx'
import MealsPage from './features/meals/MealsPage.jsx'
import KidsPage from './features/kids/KidsPage.jsx'
import SharedWishListPage from './features/kids/SharedWishListPage.jsx'
import FamilyDataProviders from './state/FamilyDataProviders.jsx'

// Old bookmarks from before the Home/Plan/Lists/Meals/Kids rename. Each one
// lands on its new home in a single hop; /tasks keeps its query string so a
// saved filter still opens the same view.
function LegacyTasks() {
  const { search } = useLocation()
  return <Navigate to={'/lists' + search} replace />
}

function BootScreen() {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )
}

function PrivateApp() {
  const { user, initializing } = useAuth()

  if (initializing) return <BootScreen />

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<SignInPage />} />
      </Routes>
    )
  }

  return (
    <FamilyDataProviders>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="plan" element={<WeekPage />} />
          <Route path="plan/month" element={<CalendarPage />} />
          <Route path="lists" element={<ListsPage />} />
          <Route path="lists/groceries" element={<ListsPage grocery />} />
          <Route path="meals" element={<MealsPage />} />
          <Route path="kids" element={<KidsPage />} />
          <Route path="parent" element={<FamilySettingsPage />} />
          <Route path="calendar" element={<Navigate to="/plan/month" replace />} />
          <Route path="tasks" element={<LegacyTasks />} />
          <Route path="planner" element={<LegacyTasks />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </FamilyDataProviders>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="wish-lists/:listId" element={<SharedWishListPage />} />
      <Route path="*" element={<PrivateApp />} />
    </Routes>
  )
}
