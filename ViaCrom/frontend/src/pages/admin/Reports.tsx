import { useState, useEffect } from 'react'
import { Search, CheckCircle, XCircle, Trash2, LogOut, Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import AdminSidebar from '../../components/AdminSidebar'
import { getAdminReports, moderateReport } from '../../lib/admin'
import { EVENT_CONFIG } from '../../types'
import type { EventType } from '../../types'

const statusColors: Record<string, string> = {
  active: 'bg-warning/10 text-warning',
  confirmed: 'bg-success/10 text-success',
  expired: 'bg-slate-100 dark:bg-dark-600 text-slate-400',
  disputed: 'bg-danger/10 text-danger',
}

export default function AdminReports() {
  const { theme, toggle } = useTheme()
  const { user: authUser, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [actionMsg, setActionMsg] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchReports = () => {
    setLoading(true)
    getAdminReports({ status: filter !== 'all' ? filter : undefined })
      .then(data => {
        setReports(data.reports || [])
        setTotal(data.total || 0)
      })
      .catch(console.warn)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReports() }, [filter])

  const handleModerate = async (reportId: string, action: 'approve' | 'reject' | 'hide') => {
    try {
      await moderateReport(reportId, action)
      const label = action === 'approve' ? 'aprobado' : action === 'reject' ? 'rechazado' : 'ocultado'
      setActionMsg(`Reporte ${label}`)
      fetchReports()
    } catch (err: any) {
      setActionMsg(err.message)
    }
    setTimeout(() => setActionMsg(''), 2500)
  }

  const filtered = reports.filter(r => {
    if (search) {
      const q = search.toLowerCase()
      if (!r.id?.includes(q) && !r.user_alias?.toLowerCase().includes(q)) return false
    }
    return true
  })

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
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">Reportes</h1>
              <p className="text-xs text-slate-400">{total} reportes</p>
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

        <div className="p-6">
          {actionMsg && (
            <div className="mb-4 px-4 py-2 bg-celeste-50 dark:bg-celeste-900/20 text-celeste-700 dark:text-celeste-300 rounded-xl text-sm">
              {actionMsg}
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-dark-700 flex items-center gap-3 flex-wrap">
              <div className="flex items-center bg-slate-50 dark:bg-dark-700 rounded-xl px-3 py-2 max-w-md flex-1">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input type="text" placeholder="Buscar reporte..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm px-2 text-slate-800 dark:text-slate-200 placeholder:text-slate-400" />
              </div>
              <div className="flex gap-1 bg-slate-100 dark:bg-dark-700 rounded-lg p-1">
                {['all', 'active', 'confirmed', 'expired', 'disputed'].map(s => (
                  <button key={s} onClick={() => setFilter(s)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium capitalize transition-all ${filter === s ? 'bg-white dark:bg-dark-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                    {s === 'all' ? 'Todos' : s}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">Sin reportes</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-100 dark:border-dark-700">
                      <th className="text-left p-4 font-medium">Tipo</th>
                      <th className="text-left p-4 font-medium">Usuario</th>
                      <th className="text-left p-4 font-medium">Descripción</th>
                      <th className="text-left p-4 font-medium">Estado</th>
                      <th className="text-left p-4 font-medium">Confianza</th>
                      <th className="text-left p-4 font-medium">Creado</th>
                      <th className="text-right p-4 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-700">
                    {filtered.map((r: any) => {
                      const cfg = EVENT_CONFIG[r.type as EventType]
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-dark-700/50 transition-colors">
                          <td className="p-4">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg?.color }} />
                              <span className="text-slate-600 dark:text-slate-300">{cfg?.label || r.type}</span>
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-500">{r.user_alias || r.user_id?.slice(0, 8)}</td>
                          <td className="p-4 text-xs text-slate-400 max-w-[200px] truncate">{r.description || '—'}</td>
                          <td className="p-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[r.status] || ''}`}>{r.status}</span>
                          </td>
                          <td className="p-4 text-xs text-slate-500">{Math.round((r.confidence_score || 0) * 100)}%</td>
                          <td className="p-4 text-xs text-slate-400">{r.created_at ? new Date(r.created_at + 'Z').toLocaleDateString() : '—'}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {r.status !== 'confirmed' && (
                                <button onClick={() => handleModerate(r.id, 'approve')}
                                  className="p-1.5 hover:bg-success/10 rounded-lg" title="Aprobar">
                                  <CheckCircle size={14} className="text-success" />
                                </button>
                              )}
                              {r.status !== 'disputed' && (
                                <button onClick={() => handleModerate(r.id, 'reject')}
                                  className="p-1.5 hover:bg-danger/10 rounded-lg" title="Rechazar">
                                  <XCircle size={14} className="text-danger" />
                                </button>
                              )}
                              <button onClick={() => handleModerate(r.id, 'hide')}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg" title="Ocultar">
                                <Trash2 size={14} className="text-slate-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
