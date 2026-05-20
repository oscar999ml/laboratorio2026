import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet'
import L from 'leaflet'
import { Filter, LogOut, Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import AdminSidebar from '../../components/AdminSidebar'
import { useSocket } from '../../contexts/SocketContext'
import { getReports } from '../../lib/api'

const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:10px;height:10px;background:#0ea5e9;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(14,165,233,0.5)"></div>',
  iconSize: [10, 10], iconAnchor: [5, 5],
})

const reportColors: Record<string, string> = {
  bloqueo: '#ef4444', marcha: '#8b5cf6', accidente: '#f97316',
  conflicto: '#f59e0b', ruta_cerrada: '#64748b', peligro: '#eab308',
  incendio: '#b91c1c', inundacion: '#0ea5e9', manifestacion: '#a855f7',
  cierre_calle: '#ef4444', evento_especial: '#ec4899', otro: '#94a3b8',
}

export default function AdminLiveMap() {
  const { theme, toggle } = useTheme()
  const { user: authUser, logout } = useAuth()
  const navigate = useNavigate()
  const { reports: liveReports, connected, onlineUsers } = useSocket()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [reports, setReports] = useState<any[]>([])

  useEffect(() => {
    getReports().then(data => setReports(data.reports || [])).catch(console.warn)
  }, [])

  useEffect(() => {
    if (liveReports.length > 0) setReports(liveReports)
  }, [liveReports])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-900 flex">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-slate-200 dark:border-dark-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg">
              <Menu size={20} className="text-slate-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">Mapa en vivo</h1>
              <p className="text-xs text-slate-400">
                {reports.length} eventos
                {onlineUsers > 0 && ` · ${onlineUsers} usuarios en línea`}
                {connected ? ' · En vivo' : ' · Reconectando...'}
              </p>
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

        <div className="flex-1 relative">
          <MapContainer center={[-16.5, -68.15]} zoom={12} className="h-full w-full" zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {reports.map((r: any) => (
              <div key={r.id}>
                <Circle
                  center={[r.latitude, r.longitude]}
                  radius={200}
                  pathOptions={{ color: reportColors[r.type] || '#ef4444', fillOpacity: 0.1, weight: 1.5 }}
                />
                <Marker position={[r.latitude, r.longitude]} />
              </div>
            ))}
          </MapContainer>

          <div className="absolute top-3 left-3 z-[1000] bg-white/90 dark:bg-dark-800/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-slate-200 dark:border-dark-600 space-y-2 text-xs">
            <div className={`flex items-center gap-2 ${connected ? 'text-green-600' : 'text-amber-500'}`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-amber-500'}`} />
              {connected ? 'En vivo' : 'Reconectando'}
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-danger" /> Eventos activos ({reports.length})
            </div>
            {onlineUsers > 0 && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-2 h-2 rounded-full bg-celeste-500" /> Usuarios en línea ({onlineUsers})
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
