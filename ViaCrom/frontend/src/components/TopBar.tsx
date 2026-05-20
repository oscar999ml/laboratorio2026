import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Menu, Moon, Sun, X, LogIn, Shield } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { useUi } from '../contexts/UiContext'
import { ROLE_LABELS } from '../types'

export default function TopBar() {
  const { theme, toggle } = useTheme()
  const { user, isStaff } = useAuth()
  const { sidebarOpen: menuOpen, setSidebarOpen: setMenuOpen } = useUi()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-slate-200/80 px-4 py-2.5">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-celeste-400 to-celeste-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <span className="font-bold text-sm hidden sm:block text-slate-700">NaviCrom</span>
          </div>

          <div className="flex-1 relative max-w-md mx-auto">
            <div className={`flex items-center bg-slate-100 rounded-xl px-3 py-2 transition-all ${searchOpen ? 'ring-2 ring-celeste-400 bg-white' : ''}`}>
              <Search size={15} className="text-slate-400 shrink-0" />
              <input type="text" placeholder="¿A dónde vas?"
                className="flex-1 bg-transparent border-none outline-none text-sm px-2 py-0 placeholder:text-slate-400"
                onFocus={() => setSearchOpen(true)} onBlur={() => setSearchOpen(false)} />
            </div>
          </div>

          <button onClick={() => setFiltersOpen(!filtersOpen)}
            className={`p-2 rounded-xl transition-colors ${filtersOpen ? 'bg-celeste-500 text-white' : 'hover:bg-slate-100 text-slate-400'}`}>
            <Filter size={17} />
          </button>

          <button onClick={toggle}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-[2000]" onClick={() => setMenuOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-dark-800 z-[2001] shadow-2xl animate-slide-down p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-celeste-400 to-celeste-600 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">N</span>
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">NaviCrom</h2>
                  <p className="text-xs text-slate-400">Rutas inteligentes</p>
                </div>
              </div>
              <button onClick={() => setMenuOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            {user ? (
              <div className="bg-celeste-50 rounded-2xl p-4 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-celeste-400 to-celeste-600 text-white flex items-center justify-center font-bold text-sm">
                  {user.alias[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="font-semibold text-sm">{user.alias}</div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Shield size={10} />
                    {ROLE_LABELS[user.role] || user.role.replace('_', ' ')}
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => { navigate('/login'); setMenuOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-celeste-50 text-celeste-600 hover:bg-celeste-100 transition-colors mb-6 font-medium text-sm">
                <LogIn size={16} />
                Iniciar sesión
              </button>
            )}

            <nav className="space-y-1">
              {[
                { label: 'Mapa', path: '/' },
                { label: 'Mis reportes', path: '/reportes' },
                { label: 'Rutas', path: '/rutas' },
                { label: 'Viajes', path: '/viajes' },
                { label: 'Perfil', path: '/perfil' },
              ].map(item => (
                <button key={item.path} onClick={() => { navigate(item.path); setMenuOpen(false) }}
                  className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-slate-600">
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="absolute bottom-6 left-6 right-6 space-y-2">
              {isStaff && (
                <button onClick={() => { navigate('/admin'); setMenuOpen(false) }}
                  className="w-full text-left px-4 py-3 rounded-xl bg-celeste-500 text-white hover:bg-celeste-600 transition-colors text-sm font-medium flex items-center gap-2">
                  <Shield size={14} />
                  Panel de Moderación
                </button>
              )}
              <p className="text-[10px] text-slate-400 text-center">NaviCrom v1.0 — Por el bien común</p>
            </div>
          </div>
        </>
      )}

      {filtersOpen && (
        <div className="absolute top-14 right-4 z-40 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 w-64 animate-scale-in">
          <h3 className="text-sm font-semibold mb-3 text-slate-700">Filtrar eventos</h3>
          {['bloqueo', 'marcha', 'accidente', 'conflicto', 'ruta_cerrada', 'peligro', 'incendio', 'inundacion', 'manifestacion', 'evento_especial'].map(type => (
            <label key={type} className="flex items-center gap-3 py-1.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-celeste-500" />
              <span className="text-sm capitalize text-slate-600">{type.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
      )}
    </>
  )
}
