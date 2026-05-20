import { useState, useEffect } from 'react'
import { Users, AlertTriangle, MapPin, ThumbsUp, Activity, TrendingUp, BarChart3, LogOut, Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import AdminSidebar from '../../components/AdminSidebar'
import { getDashboard } from '../../lib/admin'

export default function AdminDashboard() {
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.warn)
      .finally(() => setLoading(false))
  }, [])

  const stats = data ? [
    { label: 'Usuarios registrados', value: String(data.total_users || 0), change: '', icon: Users, color: 'bg-celeste-500' },
    { label: 'Reportes hoy', value: String(data.reports_today || 0), change: '', icon: AlertTriangle, color: 'bg-danger' },
    { label: 'Eventos activos', value: String(data.active_reports || 0), change: '', icon: MapPin, color: 'bg-warning' },
    { label: 'Confirmaciones', value: String(data.total_confirmations || 0), change: '', icon: ThumbsUp, color: 'bg-success' },
    { label: 'Usuarios online', value: String(data.users_online || 0), change: 'ahora', icon: Activity, color: 'bg-celeste-400' },
    { label: 'Reputación media', value: String(data.avg_reputation || '0'), change: '', icon: TrendingUp, color: 'bg-orange-500' },
  ] : []

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-900 flex">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-slate-200 dark:border-dark-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg">
              <Menu size={20} className="text-slate-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
              <p className="text-xs text-slate-400">Panel de administración</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:block">{user?.alias}</span>
            <button onClick={toggle} className="p-2 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-xl transition-colors">
              {theme === 'dark' ? <Sun size={18} className="text-slate-400" /> : <Moon size={18} className="text-slate-400" />}
            </button>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-dark-700 rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-dark-600 transition-colors text-slate-600 dark:text-slate-300">
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-20 text-slate-400">Cargando...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {stats.map((s, idx) => (
                  <div key={idx} className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center`}>
                        <s.icon size={16} className="text-white" />
                      </div>
                      {s.change && (
                        <span className="text-xs font-medium text-slate-400">{s.change}</span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{s.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Reportes por tipo</h3>
                    <BarChart3 size={18} className="text-slate-400" />
                  </div>
                  {data?.reports_by_type && data.reports_by_type.length > 0 ? (
                    <div className="space-y-3">
                      {data.reports_by_type.slice(0, 8).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="flex-1 text-sm text-slate-600 dark:text-slate-300 capitalize">{item.type.replace(/_/g, ' ')}</span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Sin datos</p>
                  )}
                </div>

                <div className="card p-6">
                  <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">Top ciudades</h3>
                  {data?.reports_by_ciudad && data.reports_by_ciudad.length > 0 ? (
                    <div className="space-y-3">
                      {data.reports_by_ciudad.map((item: any, idx: number) => {
                        const maxCount = data.reports_by_ciudad[0]?.count || 1
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: '#0ea5e9' }} />
                            <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">{item.ciudad || 'Sin ciudad'}</span>
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.count}</span>
                            <div className="w-20 h-1.5 bg-slate-100 dark:bg-dark-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-celeste-500" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Sin datos</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
