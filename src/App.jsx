import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './state/AuthContext.jsx'
import AppShell from './app/AppShell.jsx'
import SignInPage from './features/auth/SignInPage.jsx'
import DashboardPage from './features/dashboard/DashboardPage.jsx'
import MealsPage from './features/meals/MealsPage.jsx'
import PlannerPage from './features/planner/PlannerPage.jsx'
import KidsPage from './features/kids/KidsPage.jsx'

function BootScreen() {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )
}

export default function App() {
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
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="meals" element={<MealsPage />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="kids" element={<KidsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
