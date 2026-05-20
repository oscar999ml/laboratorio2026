import { useEffect, useState } from 'react'
import { getReports, confirmReport as apiConfirmReport } from '../lib/api'
import { EVENT_CONFIG } from '../types'
import type { Report } from '../types'
import { Clock, MapPin, ThumbsUp, AlertTriangle, CheckCircle, XCircle, ThumbsDown } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + 'Z').getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Ahora'
  if (min < 60) return `Hace ${min} min`
  if (min < 1440) return `Hace ${Math.floor(min / 60)}h`
  return `Hace ${Math.floor(min / 1440)}d`
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  if (!lat1 || !lng1) return null
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { reports: liveReports, connected } = useSocket()
  const [reports, setReports] = useState<Report[]>([])
  const [tab, setTab] = useState<'near' | 'all'>('near')
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
    }
  }, [])

  useEffect(() => {
    getReports().then(data => setReports(data.reports || [])).catch(console.warn)
  }, [])

  useEffect(() => {
    if (liveReports.length > 0) {
      setReports(liveReports)
    }
  }, [liveReports])

  const handleConfirm = async (reportId: string, vote: 'confirm' | 'dispute') => {
    if (!userPos || !user) return
    const report = reports.find(r => r.id === reportId)
    if (!report) return
    try {
      await apiConfirmReport(reportId, vote, userPos.lat, userPos.lng, report.latitude, report.longitude)
    } catch (err: any) {
      console.warn('Vote error:', err.message)
    }
  }

  const sorted = [...reports].sort((a, b) => {
    if (tab === 'near' && userPos) {
      const dA = getDistance(userPos.lat, userPos.lng, a.latitude, a.longitude) || 99999
      const dB = getDistance(userPos.lat, userPos.lng, b.latitude, b.longitude) || 99999
      return dA - dB
    }
    return new Date(b.created_at + 'Z').getTime() - new Date(a.created_at + 'Z').getTime()
  })

  const statusIcon = (s: string) => {
    switch(s) {
      case 'active': return <AlertTriangle size={14} className="text-warning" />
      case 'confirmed': return <CheckCircle size={14} className="text-success" />
      case 'expired': return <XCircle size={14} className="text-slate-400" />
      default: return null
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 scrollbar-hide pb-24">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-slate-100 dark:bg-dark-700 rounded-xl p-1 flex-1">
          <button onClick={() => setTab('near')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'near' ? 'bg-white dark:bg-dark-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            Cerca de ti
          </button>
          <button onClick={() => setTab('all')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'all' ? 'bg-white dark:bg-dark-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            Todos ({reports.length})
          </button>
        </div>
        {connected && (
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" title="En vivo" />
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <CheckCircle size={48} className="text-success/50 mb-4" />
          <p className="text-lg font-medium text-slate-500 dark:text-slate-300">Vía libre</p>
          <p className="text-sm">No hay eventos reportados</p>
        </div>
      ) : (
        sorted.map(r => {
          const cfg = EVENT_CONFIG[r.type]
          const dist = userPos ? getDistance(userPos.lat, userPos.lng, r.latitude, r.longitude) : null
          return (
            <div key={r.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm shrink-0"
                  style={{ background: cfg?.color || '#94a3b8' }}>
                  {cfg?.icon || r.type.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate text-slate-800 dark:text-slate-200">{cfg?.label || r.type.replace('_', ' ')}</h3>
                    {statusIcon(r.status)}
                    {r.status === 'confirmed' && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Verif</span>}
                  </div>
                  {r.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{r.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(r.created_at)}</span>
                    {dist !== null && <span className="flex items-center gap-1"><MapPin size={11} />{dist < 1000 ? `${dist}m` : `${(dist/1000).toFixed(1)}km`}</span>}
                    <span className="flex items-center gap-1"><ThumbsUp size={11} />{r.confirmations}</span>
                    <span>Conf:{Math.round(r.confidence_score * 100)}%</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleConfirm(r.id, 'confirm')}
                      className="flex-1 text-[11px] bg-celeste-50 dark:bg-celeste-900/30 hover:bg-celeste-100 text-celeste-700 dark:text-celeste-300 py-1.5 rounded-lg font-medium transition-colors">
                      <ThumbsUp size={12} className="inline mr-1" />Confirmar
                    </button>
                    <button onClick={() => handleConfirm(r.id, 'dispute')}
                      className="flex-1 text-[11px] bg-danger/5 hover:bg-danger/10 text-danger py-1.5 rounded-lg font-medium transition-colors">
                      <ThumbsDown size={12} className="inline mr-1" />Disputar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
