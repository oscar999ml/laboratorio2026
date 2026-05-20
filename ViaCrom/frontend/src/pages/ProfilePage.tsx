import { useState, useEffect } from 'react'
import { User, Settings, Shield, Bell, Info, LogOut, ChevronRight, Award, MapPin, ThumbsUp, BellOff } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'
import { ROLE_LABELS } from '../types'
import { subscribeToPush, unsubscribeFromPush } from '../lib/pushNotifications'

export default function ProfilePage() {
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const { connected } = useSocket()
  const navigate = useNavigate()
  const [alias, setAlias] = useState('')
  const [saving, setSaving] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(Notification.permission === 'granted')
  const [togglingNotif, setTogglingNotif] = useState(false)

  useEffect(() => {
    if (user?.alias) setAlias(user.alias)
  }, [user])

  const handleSaveAlias = async () => {
    if (!alias.trim() || alias === user?.alias) return
    setSaving(true)
    try {
      const token = localStorage.getItem('viacrom-token')
      await fetch('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ alias: alias.trim() }),
      })
    } catch (err: any) {
      console.warn('Save error:', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleNotifications = async () => {
    setTogglingNotif(true)
    try {
      if (notificationsEnabled) {
        await unsubscribeFromPush()
        setNotificationsEnabled(false)
      } else {
        const ok = await subscribeToPush()
        setNotificationsEnabled(ok)
      }
    } catch {
      setNotificationsEnabled(false)
    } finally {
      setTogglingNotif(false)
    }
  }

  const menuItems = [
    { label: 'Mis reportes', icon: MapPin, color: 'text-celeste-500' },
    { label: 'Configuración', icon: Settings, color: 'text-slate-400' },
    { label: 'Privacidad', icon: Shield, color: 'text-slate-400' },
    { label: 'Notificaciones', icon: Bell, color: 'text-slate-400' },
    { label: 'Acerca de', icon: Info, color: 'text-slate-400' },
  ]

  return (
    <div className="h-full overflow-y-auto scrollbar-hide pb-24">
      <div className="bg-gradient-to-br from-celeste-400 to-celeste-600 p-6 pt-10 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold backdrop-blur-sm border-2 border-white/30">
            {alias ? alias[0].toUpperCase() : '?'}
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="Tu nombre"
              value={alias}
              onChange={e => setAlias(e.target.value)}
              onBlur={handleSaveAlias}
              className="bg-transparent border-b border-white/30 text-lg font-bold outline-none pb-0.5 placeholder:text-white/50 w-full"
            />
            <div className="flex items-center gap-3 mt-1 text-xs text-white/70">
              <span className="flex items-center gap-1"><Award size={12} />Reputación {(user?.reputation_score || 0).toFixed(2)}</span>
              <span className="flex items-center gap-1"><Shield size={12} />{user?.role ? (ROLE_LABELS[user.role] || user.role) : 'usuario'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-1 -mt-2">
        <div className="card divide-y divide-slate-100 dark:divide-dark-700 overflow-hidden">
          {menuItems.map((item, idx) => (
            <button key={idx} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors">
              <item.icon size={18} className={item.color} />
              <span className="flex-1 text-sm text-left font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-dark-400">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span>{connected ? 'Conectado en vivo' : 'Desconectado'}</span>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {notificationsEnabled ? <Bell size={18} className="text-celeste-500" /> : <BellOff size={18} className="text-slate-400" />}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Notificaciones push</span>
            </div>
            <button disabled={togglingNotif} onClick={handleToggleNotifications} className={`relative w-11 h-6 rounded-full transition-colors ${notificationsEnabled ? 'bg-celeste-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              )}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Modo {theme === 'dark' ? 'oscuro' : 'claro'}</span>
            </div>
            <button onClick={toggle} className={`relative w-11 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-celeste-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <button onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-danger hover:bg-danger/5 rounded-2xl transition-colors">
          <LogOut size={18} />
          <span className="text-sm font-medium">Cerrar sesión</span>
        </button>

        <p className="text-center text-xs text-slate-400 pt-4">
          NaviCrom v1.0 — Por el bien común
        </p>
      </div>
    </div>
  )
}
