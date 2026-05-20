import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import type { UserRole } from './types'
import GpsGuard from './components/GpsGuard'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MainLayout from './components/MainLayout'
import MapPage from './pages/MapPage'
import ReportsPage from './pages/ReportsPage'
import RoutesPage from './pages/RoutesPage'
import FeedPage from './pages/FeedPage'
import ProfilePage from './pages/ProfilePage'
import ActiveNavigation from './pages/ActiveNavigation'
import PublicProfilePage from './pages/PublicProfilePage'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminReports from './pages/admin/Reports'
import AdminLiveMap from './pages/admin/LiveMap'
import AdminAnalytics from './pages/admin/Analytics'
import AdminSettings from './pages/admin/Settings'

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: UserRole }) {
  const { user, hasRole } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && !hasRole(role)) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <GpsGuard>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<MapPage />} />
          <Route path="/reportes" element={<ReportsPage />} />
          <Route path="/rutas" element={<RoutesPage />} />
          <Route path="/actividad" element={<FeedPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/navegacion" element={<ActiveNavigation />} />
          <Route path="/user/:id" element={<PublicProfilePage />} />
        </Route>

        <Route path="/admin" element={<ProtectedRoute role="moderador"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/usuarios" element={<ProtectedRoute role="moderador"><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/reportes" element={<ProtectedRoute role="moderador"><AdminReports /></ProtectedRoute>} />
        <Route path="/admin/mapa" element={<ProtectedRoute role="moderador"><AdminLiveMap /></ProtectedRoute>} />
        <Route path="/admin/analiticas" element={<ProtectedRoute role="admin_regional"><AdminAnalytics /></ProtectedRoute>} />
        <Route path="/admin/configuracion" element={<ProtectedRoute role="super_admin"><AdminSettings /></ProtectedRoute>} />
      </Routes>
    </GpsGuard>
  )
}
