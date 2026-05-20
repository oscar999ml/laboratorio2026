import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapPin, Eye, EyeOff, Shield, User, Phone, Lock, Calendar, Camera, Globe, MapPinned, Mail, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [usuario, setUsuario] = useState('')
  const [celular, setCelular] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pais, setPais] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [email, setEmail] = useState('')
  const [fechaNac, setFechaNac] = useState('')
  const [foto, setFoto] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFoto = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setFoto(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!usuario.trim()) { setError('Elige un nombre de usuario'); return }
    if (usuario.trim().length < 3) { setError('El usuario debe tener al menos 3 caracteres'); return }
    if (!celular.trim()) { setError('Ingresa tu número de celular'); return }
    if (celular.trim().length < 7) { setError('Número de celular inválido'); return }
    if (password.length < 4) { setError('La contraseña debe tener al menos 4 caracteres'); return }
    if (password !== confirmPw) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    try {
      const body: Record<string, string> = {
        alias: usuario.trim(),
        phone: celular.trim(),
        password,
      }
      if (nombres.trim()) body.nombres = nombres.trim()
      if (apellidos.trim()) body.apellidos = apellidos.trim()
      if (email.trim()) body.email = email.trim()
      if (pais) body.pais = pais
      if (ciudad.trim()) body.ciudad = ciudad.trim()
      if (fechaNac) body.fecha_nac = fechaNac
      if (foto) body.photo = foto
      await register(body)
      setSuccess(true)
      setTimeout(() => navigate('/'), 1500)
    } catch (err: any) {
      setError(err.message || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-celeste-50 via-white to-celeste-100 dark:bg-dark-950 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center p-6">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={48} className="text-success" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-dark-100 mb-1">¡Bienvenido!</h2>
          <p className="text-slate-400 dark:text-dark-400">{nombres} {apellidos}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-celeste-50 via-white to-celeste-100 dark:bg-dark-950 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 dark:opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-celeste-200 dark:bg-celeste-800 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-celeste-100 dark:bg-celeste-900 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-celeste-400 to-celeste-600 text-white shadow-lg shadow-celeste-200 dark:shadow-celeste-800/30 mb-4">
            <MapPin size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-dark-100">Crear cuenta</h1>
          <p className="text-sm text-slate-400 dark:text-dark-400">Únete a la comunidad NaviCrom</p>
        </div>

        <form onSubmit={handleRegister} className="bg-white dark:bg-dark-800 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-dark-700 space-y-4">
          <div className="flex justify-center mb-2">
            <button type="button" onClick={handleFoto} className="relative group">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-dark-700 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 dark:border-dark-500 group-hover:border-celeste-400 transition-colors">
                {foto ? (
                  <img src={foto} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={24} className="text-slate-400 dark:text-dark-400" />
                )}
              </div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 dark:text-dark-400 whitespace-nowrap">Foto opcional</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-dark-200 mb-1.5 block flex items-center gap-1.5">
                <User size={14} /> Nombres
              </label>
              <input type="text" value={nombres} onChange={e => setNombres(e.target.value)}
                placeholder="Ej: Juan" className="input-field" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-dark-200 mb-1.5 block flex items-center gap-1.5">
                <User size={14} /> Apellidos
              </label>
              <input type="text" value={apellidos} onChange={e => setApellidos(e.target.value)}
                placeholder="Ej: Pérez" className="input-field" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200 mb-1.5 block flex items-center gap-1.5">
              <User size={14} /> Nombre de usuario
            </label>
            <input type="text" value={usuario} onChange={e => setUsuario(e.target.value)}
              placeholder="Ej: juanperez" className="input-field" />
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
              <Mail size={14} /> Correo electrónico
              <span className="text-[10px] text-slate-400 dark:text-dark-500">(opcional)</span>
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com" className="input-field" />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200 mb-1.5 block flex items-center gap-1.5">
              <Globe size={14} /> País
              <span className="text-[10px] text-slate-400 dark:text-dark-500">(opcional)</span>
            </label>
            <select value={pais} onChange={e => setPais(e.target.value)}
              className="input-field appearance-none">
              <option value="">Seleccionar</option>
              {[
                'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba',
                'Ecuador', 'El Salvador', 'Guatemala', 'Honduras', 'México', 'Nicaragua',
                'Panamá', 'Paraguay', 'Perú', 'República Dominicana', 'Uruguay', 'Venezuela',
                'España', 'Estados Unidos',
              ].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-dark-200 mb-1.5 block flex items-center gap-1.5">
                <MapPinned size={14} /> Ciudad
              </label>
              <input type="text" value={ciudad} onChange={e => setCiudad(e.target.value)}
                placeholder="Ej: La Paz" className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-dark-200 mb-1.5 block flex items-center gap-1.5">
                <Calendar size={14} /> Fecha nac.
                <span className="text-[10px] text-slate-400 dark:text-dark-500">(opcional)</span>
              </label>
              <input type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)}
                className="input-field" max={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200 mb-1.5 block flex items-center gap-1.5">
              <Lock size={14} /> Contraseña
            </label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres" className="input-field pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-400 hover:text-slate-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-dark-200 mb-1.5 block flex items-center gap-1.5">
              <Lock size={14} /> Confirmar contraseña
            </label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repite la contraseña" className="input-field pr-10" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-400 hover:text-slate-600">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-danger/10 text-danger text-sm rounded-xl p-3">
              <Shield size={14} />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3 disabled:opacity-60">
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          <div className="flex items-center justify-center gap-1 text-xs text-slate-400 dark:text-dark-400">
            <span>¿Ya tienes cuenta?</span>
            <Link to="/login" className="text-celeste-500 hover:text-celeste-700 font-medium">Inicia sesión</Link>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-dark-500 text-center pt-1">
            Al registrarte aceptas los términos de uso. Tus datos están seguros.
          </p>
        </form>
      </div>
    </div>
  )
}
