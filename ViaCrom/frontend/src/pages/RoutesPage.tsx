import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvent } from 'react-leaflet'
import L from 'leaflet'
import { Navigation, Crosshair, Route as RouteIcon, Clock, AlertTriangle, X, ShieldOff, Shield, Car, Footprints, Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { calculateRoute, getReports, startTrip } from '../lib/api'
import { EVENT_CONFIG } from '../types'
import type { Route, Report } from '../types'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'

const originIcon = L.divIcon({
  className: '', html: '<div style="width:16px;height:16px;background:#22c55e;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #22c55e"></div>',
  iconSize: [16, 16], iconAnchor: [8, 8],
})
const destIcon = L.divIcon({
  className: '', html: '<div style="position:relative"><div style="width:20px;height:20px;background:#ef4444;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #ef4444;"></div><div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #ef4444;"></div></div>',
  iconSize: [20, 34], iconAnchor: [10, 34],
})

function createMarkerIcon(color: string, icon: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);font-size:10px;font-weight:700;color:white">${icon}</div>`,
    iconSize: [24, 24], iconAnchor: [12, 12],
  })
}

const LINE_EVENT_TYPES = ['bloqueo', 'marcha', 'ruta_cerrada', 'cierre_calle', 'manifestacion']

function isLineType(type: string) {
  return LINE_EVENT_TYPES.includes(type)
}

function NorthArrow() {
  return (
    <div className="absolute bottom-20 left-4 z-[1000] bg-white dark:bg-dark-800 rounded-full p-2 shadow-lg border border-slate-200 dark:border-dark-600 flex items-center justify-center w-9 h-9">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-celeste-500">
        <polyline points="12 3 6 9 12 7 18 9 12 3" fill="currentColor" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    </div>
  )
}

function MapClickHandler({ onMapClick, active }: { onMapClick: (latlng: L.LatLng) => void; active: boolean }) {
  useMapEvent('click', (e) => { if (active) onMapClick(e.latlng) })
  return null
}

export default function RoutesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { reports: liveReports, joinTrip } = useSocket()
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [destPos, setDestPos] = useState<{ lat: number; lng: number } | null>(null)
  const [routes, setRoutes] = useState<Route[]>([])
  const [selectedRoute, setSelectedRoute] = useState(0)
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const [destMode, setDestMode] = useState(false)
  const [avoidEvents, setAvoidEvents] = useState(true)
  const [travelMode, setTravelMode] = useState<'driving' | 'walking'>('driving')
  const [accuracy, setAccuracy] = useState(0)
  const fittedRef = useRef(false)
  const initialCenter: [number, number] = [-16.5, -68.15]

  useEffect(() => {
    getReports().then(data => setReports(data.reports || [])).catch(console.warn)
  }, [])

  useEffect(() => {
    if (liveReports.length > 0) setReports(liveReports)
  }, [liveReports])

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setAccuracy(pos.coords.accuracy)
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      )
      const id = navigator.geolocation.watchPosition(
        pos => {
          setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setAccuracy(pos.coords.accuracy)
        },
        null,
        { enableHighAccuracy: true, maximumAge: 5000 }
      )
      return () => navigator.geolocation.clearWatch(id)
    }
  }, [])

  const handleMapClick = (latlng: L.LatLng) => {
    if (!destMode) return
    setDestPos({ lat: latlng.lat, lng: latlng.lng })
    setDestMode(false)
  }

  const handleTraceRoute = useCallback(async () => {
    if (!userPos || !destPos) return
    setLoading(true)
    setRoutes([])
    try {
      const repData = await getReports()
      const avoid = avoidEvents ? (repData.reports || []).map((r: any) => ({
        latitude: r.latitude,
        longitude: r.longitude,
        type: r.type,
        radius: r.radius_meters || (isLineType(r.type) ? 150 : 50),
      })) : []
      const routeData = await calculateRoute(userPos, destPos, avoid, travelMode)
      setRoutes(routeData.routes || [])
      setSelectedRoute(0)
      fittedRef.current = false
    } catch (err: any) {
      console.warn('Route error:', err.message)
    } finally {
      setLoading(false)
    }
  }, [userPos, destPos, avoidEvents, travelMode])

  const handleStartTrip = async () => {
    if (routes.length === 0 || !userPos || !destPos) return
    setStarting(true)
    try {
      const route = routes[selectedRoute]
      const result = await startTrip(userPos, destPos, route.geometry)
      if (result.trip?.id) {
        joinTrip(result.trip.id)
        navigate(`/navegacion?trip=${result.trip.id}`)
      }
    } catch (err: any) {
      console.warn('Start trip error:', err.message)
    } finally {
      setStarting(false)
    }
  }

  const mapCenter: [number, number] = userPos ? [userPos.lat, userPos.lng] : initialCenter

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white dark:bg-dark-800 px-4 py-3 border-b border-slate-200 dark:border-dark-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setTravelMode(travelMode === 'driving' ? 'walking' : 'driving')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                travelMode === 'driving'
                  ? 'bg-celeste-50 text-celeste-600 border-celeste-200 dark:bg-celeste-900/30 dark:text-celeste-400 dark:border-celeste-800'
                  : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
              }`}>
              {travelMode === 'driving' ? <Car size={14} /> : <Footprints size={14} />}
              {travelMode === 'driving' ? 'Auto' : 'A pie'}
            </button>
            <div className="text-sm text-slate-500 dark:text-dark-400">
              {userPos ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {destPos ? 'Destino seleccionado' : 'Toca el mapa'}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Esperando GPS...
                </span>
              )}
            </div>
          </div>
          {destPos && (
            <button onClick={() => { setDestPos(null); setRoutes([]) }}
              className="text-xs text-danger hover:underline">Quitar destino</button>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer center={mapCenter} zoom={15} className="h-full w-full" zoomControl={false} key={userPos ? `${userPos.lat}-${userPos.lng}` : 'default'}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <MapClickHandler onMapClick={handleMapClick} active={destMode} />

          {userPos && (
            <>
              <Circle center={[userPos.lat, userPos.lng]} radius={accuracy || 50}
                pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.06, weight: 1 }} />
              <Marker position={[userPos.lat, userPos.lng]} icon={originIcon} />
            </>
          )}
          {destPos && <Marker position={[destPos.lat, destPos.lng]} icon={destIcon} />}

          {routes[selectedRoute]?.geometry?.length > 0 && (
            <Polyline positions={routes[selectedRoute].geometry.map((c: any) => [c.latitude, c.longitude])} color="#0ea5e9" weight={5} opacity={0.85} />
          )}

          {reports.map(r => {
            const cfg = EVENT_CONFIG[r.type]
            const nearRoute = routes[selectedRoute]?.blockages_on_route?.some((b: any) => b.id === r.id)
            const lineType = isLineType(r.type)
            const radius = (r as any).radius_meters ? Math.min((r as any).radius_meters, 15) : (lineType ? 10 : 15)
            return (
              <div key={r.id}>
                {lineType && radius > 0 ? (
                  <Circle
                    center={[r.latitude, r.longitude]}
                    radius={radius}
                    pathOptions={{
                      color: nearRoute ? '#ef4444' : (cfg?.color || '#6b7280'),
                      fillColor: nearRoute ? '#ef4444' : (cfg?.color || '#6b7280'),
                      fillOpacity: 0.1,
                      weight: 2,
                      dashArray: '8 4',
                    }}
                  />
                ) : (
                  <Marker
                    position={[r.latitude, r.longitude]}
                    icon={createMarkerIcon(nearRoute ? '#ef4444' : (cfg?.color || '#6b7280'), cfg?.icon || '!')}
                  />
                )}
              </div>
            )
          })}

          <AutoFitBounds coords={routes[selectedRoute]?.geometry || []} userPos={userPos} destPos={destPos} fittedRef={fittedRef} />
          <NorthArrow />
        </MapContainer>

        {!destPos && !destMode && (
          <>
            <button onClick={() => setDestMode(true)}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-dark-800 text-celeste-500 px-5 py-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-dark-600 text-sm font-medium flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-dark-700 transition-all active:scale-95">
              <Crosshair size={16} />
              Elegir destino en el mapa
            </button>
            <button onClick={() => setAvoidEvents(!avoidEvents)}
              className={`absolute top-3 right-3 z-[1000] p-2.5 rounded-xl shadow-lg border transition-all ${
                avoidEvents
                  ? 'bg-danger text-white border-danger'
                  : 'bg-white dark:bg-dark-800 text-slate-500 dark:text-dark-200 border-slate-200 dark:border-dark-600'
              }`} title={avoidEvents ? 'Evitar eventos activado' : 'Evitar eventos desactivado'}>
              {avoidEvents ? <Shield size={18} /> : <ShieldOff size={18} />}
            </button>
          </>
        )}

        {destMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-celeste-500/90 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <Crosshair size={14} />
            Toca el mapa para marcar el destino
          </div>
        )}

        {destMode && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000]">
            <button onClick={() => setDestMode(false)}
              className="w-full bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-200 py-3 rounded-2xl font-medium shadow-lg border border-slate-200 dark:border-dark-600 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-dark-700">
              <X size={18} /> Cancelar
            </button>
          </div>
        )}

        {destPos && !routes.length && !loading && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000]">
            <button onClick={handleTraceRoute}
              className="w-full bg-gradient-to-r from-celeste-500 to-celeste-600 text-white py-3.5 rounded-2xl font-semibold shadow-lg flex items-center justify-center gap-2 hover:from-celeste-600 hover:to-celeste-700 active:scale-[0.98] transition-all">
              <RouteIcon size={18} />
              Trazar ruta
            </button>
          </div>
        )}

        {loading && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white dark:bg-dark-800 rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-dark-600 flex items-center justify-center gap-3 text-slate-500">
            <div className="w-5 h-5 border-2 border-celeste-500 border-t-transparent rounded-full animate-spin" />
            Calculando ruta...
          </div>
        )}
      </div>

      {routes.length > 0 && (
        <div className="bg-white dark:bg-dark-800 border-t border-slate-200 dark:border-dark-600 rounded-t-3xl p-4 space-y-3 max-h-56 overflow-y-auto">
          <p className="text-xs text-slate-400 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-2">
              <span>{routes.length} ruta(s) encontrada(s)</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                routes[selectedRoute]?.source === 'local'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>{routes[selectedRoute]?.source === 'local' ? 'Local (con bloqueos)' : 'OSRM (sin bloqueos)'}</span>
            </span>
            <span className="flex items-center gap-1 text-danger">Evitando {routes[selectedRoute]?.blockages_on_route?.length || 0} evento(s)</span>
          </p>
          {routes.map((r, idx) => (
            <button key={idx} onClick={() => setSelectedRoute(idx)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                selectedRoute === idx
                  ? 'border-celeste-400 bg-celeste-50 dark:bg-celeste-900/20'
                  : 'border-slate-100 dark:border-dark-600 hover:border-slate-300 dark:hover:border-dark-400'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${selectedRoute === idx ? 'bg-celeste-500 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'}`}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">Ruta {idx + 1}
                      {r.source === 'local' ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">Local</span>
                      ) : r.source === 'osrm' ? (
                        <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">OSRM</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1"><RouteIcon size={12} />{(r.distance / 1000).toFixed(1)} km</span>
                      <span className="flex items-center gap-1"><Clock size={12} />{Math.round(r.duration / 60)} min</span>
                    </div>
                  </div>
                </div>
                {r.blockages_on_route.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-danger">
                    <AlertTriangle size={12} />{r.blockages_on_route.length}
                  </span>
                )}
              </div>
            </button>
          ))}
          <button onClick={handleStartTrip} disabled={starting}
            className="w-full py-3 bg-gradient-to-r from-celeste-500 to-celeste-600 hover:from-celeste-600 hover:to-celeste-700 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-celeste-200 disabled:opacity-60">
            <Navigation size={18} />
            {starting ? 'Iniciando...' : 'Iniciar viaje'}
          </button>
        </div>
      )}
    </div>
  )
}

function AutoFitBounds({ coords, userPos, destPos, fittedRef }: {
  coords: { latitude: number; longitude: number }[]
  userPos: { lat: number; lng: number } | null
  destPos: { lat: number; lng: number } | null
  fittedRef: React.MutableRefObject<boolean>
}) {
  const map = useMap()
  if (coords.length > 0 && !fittedRef.current) {
    const bounds = L.latLngBounds(coords.map(c => [c.latitude, c.longitude]))
    if (userPos) bounds.extend([userPos.lat, userPos.lng])
    if (destPos) bounds.extend([destPos.lat, destPos.lng])
    map.fitBounds(bounds, { padding: [50, 50] })
    fittedRef.current = true
  }
  return null
}
