import { useState, useEffect } from 'react'
import { TrendingUp, Users, AlertTriangle, MapPin, Clock, Activity, BarChart3, PieChart, LogOut, Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import AdminSidebar from '../../components/AdminSidebar'
import { getAnalytics } from '../../lib/admin'

export default function AdminAnalytics() {
  const { theme, toggle } = useTheme()
  const { user: authUser, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAnalytics(7)
      .then(setData)
      .catch(console.warn)
      .finally(() => setLoading(false))
  }, [])

  const metrics = data ? [
    { label: 'Total reportes', value: data.reports_by_day?.reduce((a: number, d: any) => a + d.count, 0) || 0, icon: AlertTriangle, color: 'text-danger' },
    { label: 'Nuevos registros', value: data.registrations_by_day?.reduce((a: number, d: any) => a + d.count, 0) || 0, icon: Users, color: 'text-celeste-500' },
    { label: 'Roles distintos', value: data.role_distribution?.length || 0, icon: Activity, color: 'text-success' },
    { label: 'Top reporteros', value: data.top_reporters?.length || 0, icon: MapPin, color: 'text-celeste-400' },
  ] : []

  const maxReportDay = data?.reports_by_day ? Math.max(...data.reports_by_day.map((d: any) => d.count), 1) : 1

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
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">Analíticas</h1>
              <p className="text-xs text-slate-400">Métricas de los últimos 7 días</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:block">{authUser?.alias}</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((m, idx) => (
                  <div key={idx} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <m.icon size={16} className={m.color} />
                    </div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{m.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200"><BarChart3 size={16} /> Reportes por día</h3>
                  {data?.reports_by_day && data.reports_by_day.length > 0 ? (
                    <div className="flex items-end gap-2 h-40">
                      {data.reports_by_day.map((d: any, i: number) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-celeste-100 dark:bg-celeste-900/30 rounded-t-sm relative" style={{ height: `${(d.count / maxReportDay) * 100}%` }}>
                            <div className="absolute bottom-0 left-0 right-0 bg-celeste-500 rounded-t-sm" style={{ height: `${(d.count / maxReportDay) * 100}%` }} />
                          </div>
                          <span className="text-[8px] text-slate-400">{d.date?.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Sin datos</p>
                  )}
                </div>

                <div className="card p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200"><PieChart size={16} /> Distribución de roles</h3>
                  {data?.role_distribution && data.role_distribution.length > 0 ? (
                    <div className="space-y-4">
                      {data.role_distribution.slice(0, 8).map((r: any, idx: number) => {
                        const totalRoles = data.role_distribution.reduce((a: number, rr: any) => a + rr.count, 0) || 1
                        const pct = Math.round((r.count / totalRoles) * 100)
                        return (
                          <div key={idx}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">{r.role.replace(/_/g, ' ')}</span>
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{r.count}</span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-dark-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-celeste-500" style={{ width: `${pct}%` }} />
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

              <div className="card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200"><TrendingUp size={16} /> Top reporteros</h3>
                {data?.top_reporters && data.top_reporters.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-400 border-b border-slate-100 dark:border-dark-700">
                          <th className="text-left p-3 font-medium">Usuario</th>
                          <th className="text-left p-3 font-medium">Reportes</th>
                          <th className="text-left p-3 font-medium">Confirmaciones</th>
                          <th className="text-left p-3 font-medium">Reputación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-dark-700">
                        {data.top_reporters.map((u: any) => (
                          <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-dark-700/50 transition-colors">
                            <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{u.alias || u.id?.slice(0, 8)}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">{u.total_reports || 0}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">{u.total_confirmations || 0}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-200 dark:bg-dark-600 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-success" style={{ width: `${(u.reputation_score || 0) * 100}%` }} />
                                </div>
                                <span className="text-xs text-slate-500">{(u.reputation_score || 0).toFixed(2)}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Sin datos</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
