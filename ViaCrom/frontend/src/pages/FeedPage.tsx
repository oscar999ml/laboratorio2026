import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFeed } from '../lib/feed'
import type { FeedItem } from '../lib/feed'
import { EVENT_CONFIG } from '../types'
import { useSocket } from '../contexts/SocketContext'
import { Clock, MapPin, Users, Activity } from 'lucide-react'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + 'Z').getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Ahora'
  if (min < 60) return `Hace ${min} min`
  if (min < 1440) return `Hace ${Math.floor(min / 60)}h`
  return `Hace ${Math.floor(min / 1440)}d`
}

export default function FeedPage() {
  const navigate = useNavigate()
  const { connected, reports } = useSocket()
  const [items, setItems] = useState<FeedItem[]>([])
  const [tab, setTab] = useState<'near' | 'all'>('near')
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
    }
  }, [])

  const fetchFeed = async (lat: number, lng: number) => {
    setLoading(true)
    try {
      const data = await getFeed(lat, lng, tab === 'near' ? 5000 : 50000)
      setItems(data.items || [])
    } catch (err: any) {
      console.warn('Feed error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userPos) {
      fetchFeed(userPos.lat, userPos.lng)
      const interval = setInterval(() => fetchFeed(userPos.lat, userPos.lng), 15000)
      return () => clearInterval(interval)
    }
  }, [userPos, tab])

  useEffect(() => {
    if (reports.length > 0 && userPos) {
      fetchFeed(userPos.lat, userPos.lng)
    }
  }, [reports.length])

  const handleItemClick = (item: FeedItem) => {
    if (item.latitude && item.longitude) {
      navigate(`/?lat=${item.latitude}&lng=${item.longitude}`)
    }
  }

  function getItemIcon(item: FeedItem) {
    const cfg = item.event_type ? EVENT_CONFIG[item.event_type as keyof typeof EVENT_CONFIG] : null
    const iconEl = cfg?.icon || '📌'
    const color = cfg?.color || '#94a3b8'
    return { icon: iconEl, color }
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-hide pb-24">
      <div className="sticky top-0 z-10 bg-white dark:bg-dark-800 pt-3 px-4 pb-2 border-b border-slate-100 dark:border-dark-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Actividad</h2>
          <div className="flex items-center gap-2">
            {connected && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="En vivo" />}
            <span className="text-[10px] text-slate-400">{items.length} eventos</span>
          </div>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-dark-700 rounded-xl p-1">
          <button onClick={() => setTab('near')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'near' ? 'bg-white dark:bg-dark-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            Cerca de ti
          </button>
          <button onClick={() => setTab('all')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'all' ? 'bg-white dark:bg-dark-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            Todas las ciudades
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 space-y-2">
        {loading && items.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">Cargando actividad...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Activity size={40} className="mx-auto mb-3 text-slate-300 dark:text-dark-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Sin actividad reciente</p>
            <p className="text-xs mt-1">Los eventos aparecerán aquí en tiempo real</p>
          </div>
        ) : (
          items.map(item => {
            const { icon, color } = getItemIcon(item)
            const isTrend = item.type === 'trend'
            return (
              <button key={item.id} onClick={() => handleItemClick(item)}
                className={`w-full text-left p-3.5 rounded-2xl transition-all active:scale-[0.98] border ${
                  isTrend
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30'
                    : 'bg-white dark:bg-dark-800 border-slate-100 dark:border-dark-600 hover:border-celeste-200 dark:hover:border-celeste-800'
                }`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs shrink-0 mt-0.5"
                    style={{ background: isTrend ? '#f59e0b' : color }}>
                    {isTrend ? <Users size={14} /> : icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isTrend ? (
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                          {item.event_count} eventos cerca
                        </span>
                      ) : (
                        <>
                          {item.user_alias && (
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/user/${item.user_id}`) }}
                              className="text-sm font-semibold text-celeste-600 dark:text-celeste-400 hover:underline">
                              {item.user_alias}
                            </button>
                          )}
                          <span className="text-xs text-slate-400">
                            {item.type === 'confirm'
                              ? `${item.confirmations} personas confirmaron`
                              : 'reportó'}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {item.location || item.description}
                      {item.confirmations !== undefined && item.confirmations > 0 && !isTrend && (
                        <span className="text-celeste-500 font-medium ml-1">{item.confirmations} conf.</span>
                      )}
                      {item.confidence !== undefined && item.confidence > 0 && !isTrend && (
                        <span className="text-slate-400 ml-1">· {Math.round(item.confidence * 100)}%</span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={10} />{timeAgo(item.created_at)}</span>
                      {item.distance !== null && (
                        <span className="flex items-center gap-1"><MapPin size={10} />{item.distance < 1000 ? `${item.distance}m` : `${(item.distance / 1000).toFixed(1)}km`}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
