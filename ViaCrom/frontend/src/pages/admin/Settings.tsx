import { useState, useEffect } from 'react'
import { Save, Clock, Sliders, EyeOff, Database, FileText, AlertTriangle, LogOut, Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import AdminSidebar from '../../components/AdminSidebar'
import { getSettings, updateSettings, getLogs } from '../../lib/admin'
import { EVENT_TYPES, EVENT_CONFIG } from '../../types'
import type { EventType } from '../../types'

export default function AdminSettings() {
  const { theme, toggle } = useTheme()
  const { user: authUser, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expiry, setExpiry] = useState(120)
  const [maxDistance, setMaxDistance] = useState(200)
  const [minConfirm, setMinConfirm] = useState(3)
  const [saved, setSaved] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    getSettings()
      .then(s => {
        setExpiry(s.report_expiry_minutes || 120)
        setMaxDistance(s.max_report_distance || 200)
        setMinConfirm(s.min_confirmations || 3)
      })
      .catch(console.warn)
  }, [])

  const handleSave = async () => {
    try {
      await updateSettings({
        report_expiry_minutes: expiry,
        max_report_distance: maxDistance,
        min_confirmations: minConfirm,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      console.warn(err.message)
    }
  }

  const handleShowLogs = async () => {
    try {
      const data = await getLogs()
      setLogs(data.logs || [])
      setShowLogs(true)
    } catch (err: any) {
      console.warn(err.message)
    }
  }

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
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">Configuración</h1>
              <p className="text-xs text-slate-400">Ajustes del sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
        <div className="p-6 space-y-6 max-w-2xl">
          <div className="card p-6 space-y-6">
            <div className="flex items-center gap-2 mb-1"><Clock size={18} className="text-celeste-500" /><h3 className="font-semibold text-slate-800 dark:text-slate-200">Expiración de eventos</h3></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Tiempo de expiración (minutos)</label>
                <input type="number" value={expiry} onChange={e => setExpiry(Number(e.target.value))} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Distancia máxima GPS (metros)</label>
                <input type="number" value={maxDistance} onChange={e => setMaxDistance(Number(e.target.value))} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Confirmaciones mínimas</label>
                <input type="number" value={minConfirm} onChange={e => setMinConfirm(Number(e.target.value))} className="input-field" />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-celeste-500 to-celeste-600 hover:from-celeste-600 hover:to-celeste-700 text-white rounded-xl text-sm font-medium transition-all active:scale-95 shadow-lg shadow-celeste-200">
                <Save size={16} />
                Guardar
              </button>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1"><Database size={18} className="text-success" /><h3 className="font-semibold text-slate-800 dark:text-slate-200">Mantenimiento</h3></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={handleShowLogs}
                className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-dark-700 rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-dark-600 transition-colors text-slate-600 dark:text-slate-300">
                <FileText size={16} /> Ver logs
              </button>
            </div>
          </div>

          {showLogs && (
            <div className="card p-6 space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Logs del sistema</h3>
              {logs.length === 0 ? (
                <p className="text-sm text-slate-400">Sin registros</p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {logs.map((log: any) => (
                    <div key={log.id} className="text-xs text-slate-500 dark:text-slate-400 p-2 bg-slate-50 dark:bg-dark-700 rounded-lg">
                      <span className="text-slate-400">{log.created_at?.slice(0, 16)}</span>
                      {' '}
                      <span className="font-medium text-slate-600 dark:text-slate-300">{log.user_alias || 'sistema'}</span>
                      {' '}
                      <span>{log.action}</span>
                      {log.details && <span className="text-slate-400 ml-1">{log.details}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {saved && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-success text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-medium animate-fade-in">
              Configuración guardada
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
