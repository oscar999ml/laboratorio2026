import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, AlertTriangle, Map, BarChart3, Settings, X, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ROLE_LABELS } from '../types'

const menuItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { path: '/admin/reportes', icon: AlertTriangle, label: 'Reportes' },
  { path: '/admin/mapa', icon: Map, label: 'Mapa en vivo' },
  { path: '/admin/analiticas', icon: BarChart3, label: 'Analíticas' },
  { path: '/admin/configuracion', icon: Settings, label: 'Configuración' },
]

export default function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const content = (
    <div className="h-full flex flex-col bg-white dark:bg-dark-800 border-r border-slate-200 dark:border-dark-600">
      <div className="p-5 border-b border-slate-200 dark:border-dark-600">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-celeste-600">NaviCrom</h2>
            <p className="text-[10px] text-slate-400">{user ? (ROLE_LABELS[user.role] || user.role) : 'Admin'}</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg">
            <X size={18} />
          </button>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map(item => {
          const active = location.pathname === item.path
          return (
            <button key={item.path} onClick={() => { navigate(item.path); onClose() }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-celeste-500 text-white shadow-md shadow-celeste-200' : 'hover:bg-slate-100 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-400'
              }`}>
              <item.icon size={18} />
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-200 dark:border-dark-600 space-y-2">
        <button onClick={() => navigate('/')}
          className="w-full text-center text-xs text-slate-400 hover:text-celeste-500 transition-colors py-2">
          Volver al mapa público
        </button>
        <button onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center justify-center gap-2 text-xs text-danger py-2 hover:bg-danger/5 rounded-xl transition-colors">
          <LogOut size={12} /> Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="hidden lg:block w-64 shrink-0">{content}</div>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
          <div className="fixed left-0 top-0 bottom-0 w-72 z-50 lg:hidden">{content}</div>
        </>
      )}
    </>
  )
}
