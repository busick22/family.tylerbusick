import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './state/AuthContext.jsx'
import AppShell from './app/AppShell.jsx'
import SignInPage from './features/auth/SignInPage.jsx'
import DashboardPage from './features/dashboard/DashboardPage.jsx'
import MealsPage from './features/meals/MealsPage.jsx'
import PlannerPage from './features/planner/PlannerPage.jsx'
import KidsPage from './features/kids/KidsPage.jsx'
import SharedWishListPage from './features/kids/SharedWishListPage.jsx'
import FamilyDataProviders from './state/FamilyDataProviders.jsx'

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
          <Route index element={<DashboardPage />} />
          <Route path="meals" element={<MealsPage />} />
          <Route path="planner" element={<PlannerPage />} />
          <Route path="kids" element={<KidsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </FamilyDataProviders>
  )
}

export default function App() {
  return <Routes>
    <Route path="wish-lists/:listId" element={<SharedWishListPage />} />
    <Route path="*" element={<PrivateApp />} />
  </Routes>
}
