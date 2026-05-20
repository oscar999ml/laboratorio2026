import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapPin, Eye, EyeOff, Shield, User, Phone, Lock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [alias, setAlias] = useState('')
  const [celular, setCelular] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!alias.trim() && !celular.trim()) { setError('Ingresa tu usuario o celular'); return }
    if (!password.trim()) { setError('Ingresa tu contraseña'); return }

    setLoading(true)
    try {
      await login(alias.trim(), celular.trim(), password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-celeste-50 via-white to-celeste-100 dark:bg-dark-950 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 dark:opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-celeste-200 dark:bg-celeste-800 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-celeste-100 dark:bg-celeste-900 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-celeste-400 to-celeste-600 text-white shadow-lg shadow-celeste-200 dark:shadow-celeste-800/30 mb-4">
            <MapPin size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-dark-100">NaviCrom</h1>
          <p className="text-sm text-slate-400 dark:text-dark-400">Rutas inteligentes, comunidad informada</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white dark:bg-dark-800 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-dark-700 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200 mb-1.5 block flex items-center gap-1.5">
              <User size={14} /> Usuario
            </label>
            <input type="text" value={alias} onChange={e => setAlias(e.target.value)}
              placeholder="Tu usuario" className="input-field" autoFocus />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200 mb-1.5 block flex items-center gap-1.5">
              <Phone size={14} /> Número de celular
            </label>
            <input type="tel" value={celular} onChange={e => setCelular(e.target.value)}
              placeholder="Ej: 71234567" className="input-field" maxLength={15} />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200 mb-1.5 block flex items-center gap-1.5">
              <Lock size={14} /> Contraseña
            </label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className="input-field pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-400 hover:text-slate-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-danger/10 text-danger text-sm rounded-xl p-3">
              {loading ? null : <Shield size={14} />}
              {error}
            </div>
          )}

          {!loading && (
            <div className="text-xs text-center text-slate-400 dark:text-dark-500 bg-slate-50 dark:bg-dark-900/50 rounded-xl p-3">
              <p className="font-medium text-slate-500 dark:text-dark-400 mb-1">Acceso rápido</p>
              <p><span className="text-celeste-500">admin</span> / admin123 <span className="text-slate-300 dark:text-dark-500 mx-1">•</span> super_admin</p>
              <p><span className="text-celeste-500">usuario</span> / user123 <span className="text-slate-300 dark:text-dark-500 mx-1">•</span> usuario normal</p>
              <p className="text-[10px] text-slate-300 dark:text-dark-500 mt-1">Requiere backend en puerto 3000</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="btn-primary w-full text-base py-3 disabled:opacity-60">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <div className="flex items-center justify-center gap-1 text-xs text-slate-400 dark:text-dark-400">
            <span>¿No tienes cuenta?</span>
            <Link to="/registro" className="text-celeste-500 hover:text-celeste-700 font-medium">Regístrate</Link>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-dark-500 text-center pt-2">
            Al ingresar aceptas los términos de uso. Datos seguros.
          </p>
        </form>
      </div>
    </div>
  )
}
