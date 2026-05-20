import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Award, MapPin, ThumbsUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { EVENT_CONFIG } from '../types'
import type { EventType } from '../types'

interface PublicUser {
  id: string
  alias: string
  photo: string | null
  role: string
  ciudad: string | null
  pais: string | null
  reputation_score: number
  level: string
  level_color: string
  total_reports: number
  total_confirmations: number
  precision: number
  last_active: string | null
  created_at: string
  recent_reports: any[]
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + 'Z').getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Ahora'
  if (min < 60) return `Hace ${Math.floor(min)} min`
  if (min < 1440) return `Hace ${Math.floor(min / 60)}h`
  return `Hace ${Math.floor(min / 1440)}d`
}

export default function PublicProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    fetch(`http://localhost:3000/api/users/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Usuario no encontrado')
        return res.json()
      })
      .then(data => setProfile(data.user))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-900 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Cargando...</p>
    </div>
  )

  if (error || !profile) return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-900 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500 dark:text-slate-300 text-lg font-medium">{error || 'Perfil no disponible'}</p>
        <Link to="/" className="text-celeste-500 text-sm hover:underline mt-2 inline-block">Volver al mapa</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-900">
      <header className="bg-gradient-to-br from-celeste-500 to-celeste-700 text-white px-4 pt-4 pb-8">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/20 rounded-lg mb-4">
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-end gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold backdrop-blur-sm border-2 border-white/40 shrink-0"
            style={profile.photo ? { backgroundImage: `url(${profile.photo})`, backgroundSize: 'cover' } : {}}>
            {!profile.photo && (profile.alias[0]?.toUpperCase() || '?')}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{profile.alias}</h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-white/70">
              {profile.ciudad && <span className="flex items-center gap-1"><MapPin size={11} />{profile.ciudad}</span>}
              {profile.last_active && (
                <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(profile.last_active)}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: profile.level_color }}>
              {profile.level.charAt(0).toUpperCase() + profile.level.slice(1)}
            </div>
            <div className="text-[10px] text-white/60">Nivel</div>
          </div>
        </div>
      </header>

      <div className="px-4 -mt-4 space-y-3 pb-8">
        <div className="bg-white dark:bg-dark-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-dark-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-slate-800 dark:text-white">{profile.total_reports}</div>
              <div className="text-[10px] text-slate-400">Reportes</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800 dark:text-white">{profile.total_confirmations}</div>
              <div className="text-[10px] text-slate-400">Confirmaciones</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800 dark:text-white">{profile.precision}%</div>
              <div className="text-[10px] text-slate-400">Precisión</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-dark-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Reputación</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">{(profile.reputation_score || 0).toFixed(2)}</span>
            </div>
            <div className="mt-1 h-2 bg-slate-100 dark:bg-dark-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(profile.reputation_score || 0) * 100}%`, background: profile.level_color }} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-dark-700">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Reportes recientes</h3>
          {profile.recent_reports.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Sin reportes aún</p>
          ) : (
            <div className="space-y-2">
              {profile.recent_reports.map((r: any) => {
                const cfg = EVENT_CONFIG[r.type as EventType]
                return (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-dark-700 rounded-xl">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs shrink-0"
                      style={{ background: cfg?.color || '#94a3b8' }}>
                      {cfg?.icon || '!'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{cfg?.label || r.type}</span>
                        {r.status === 'confirmed' && <CheckCircle size={10} className="text-success" />}
                      </div>
                      {r.description && <p className="text-[10px] text-slate-400 truncate">{r.description}</p>}
                    </div>
                    <div className="text-right text-[10px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <ThumbsUp size={9} /> {r.confirmations || 0}
                      </div>
                      <div>{r.confidence_score ? `${Math.round(r.confidence_score * 100)}%` : ''}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
