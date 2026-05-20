import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvent, Circle } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Plus, Crosshair, Navigation, X, Thermometer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getReports } from '../lib/api'
import { EVENT_CONFIG } from '../types'
import type { Report } from '../types'
import { useUi } from '../contexts/UiContext'
import { useSocket } from '../contexts/SocketContext'
import EventModal from '../components/EventModal'
import { useAuth } from '../contexts/AuthContext'
import { confirmReport } from '../lib/api'

function HeatmapLayer() {
  const map = useMap()
  const layerRef = useRef<L.HeatLayer | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!visible) {
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null }
      return
    }

    fetch('http://localhost:3000/api/heatmap?days=7')
      .then(r => r.json())
      .then(data => {
        if (map && data.points?.length) {
          const latlngs = data.points.map((p: any) => [p.lat, p.lng, p.weight] as [number, number, number])
          if (layerRef.current) map.removeLayer(layerRef.current)
          layerRef.current = L.heatLayer(latlngs, {
            radius: 30,
            blur: 20,
            maxZoom: 17,
            max: 5,
            gradient: { 0.2: '#0ea5e9', 0.4: '#22c55e', 0.6: '#eab308', 0.8: '#f97316', 1.0: '#ef4444' },
          })
          map.addLayer(layerRef.current)
        }
      })
      .catch(console.warn)

    return () => { if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null } }
  }, [map, visible])

  return (
    <button
      onClick={() => setVisible(v => !v)}
      className={`absolute bottom-4 left-20 z-[1000] p-3 rounded-xl shadow-lg border transition-all ${
        visible ? 'bg-celeste-500 text-white border-celeste-500' : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-dark-200 border-slate-200 dark:border-dark-600'
      }`}
    >
      <Thermometer size={20} />
    </button>
  )
}

function createMarkerIcon(color: string, icon: string, confirmed: boolean) {
  const size = confirmed ? 40 : 36
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);font-size:14px;font-weight:700;color:white;${confirmed ? 'outline:2px solid #22c55e;' : ''}">${icon}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function RecenterButton({ onRecenter }: { onRecenter: (map: L.Map) => void }) {
  const map = useMap()
  return (
    <button
      onClick={() => onRecenter(map)}
      className="absolute bottom-36 left-4 z-[1000] bg-white dark:bg-dark-800 p-3 rounded-xl shadow-lg hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors border border-slate-200 dark:border-dark-600"
    >
      <Crosshair size={20} className="text-celeste-500" />
    </button>
  )
}

function MapClickHandler({ onMapClick, active }: { onMapClick: (latlng: L.LatLng) => void; active: boolean }) {
  useMapEvent('click', (e) => {
    if (active) onMapClick(e.latlng)
  })
  return null
}

const selectIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:24px;height:24px"><div style="width:24px;height:24px;background:#0ea5e9;border-radius:50%;border:4px solid white;box-shadow:0 0 0 3px #0ea5e9, 0 2px 8px rgba(0,0,0,0.3);"></div><div style="position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #0ea5e9;"></div></div>`,
  iconSize: [24, 36],
  iconAnchor: [12, 36],
})

export default function MapPage() {
  const navigate = useNavigate()
  const { sidebarOpen } = useUi()
  const { user } = useAuth()
  const { reports: liveReports, connected } = useSocket()
  const [reports, setReports] = useState<Report[]>([])
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [accuracy, setAccuracy] = useState(0)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    getReports().then(data => setReports(data.reports || [])).catch(console.warn)
  }, [])

  useEffect(() => {
    if (liveReports.length > 0) setReports(liveReports)
  }, [liveReports])

  const handleConfirm = async (reportId: string, vote: 'confirm' | 'dispute') => {
    if (!userPos || !user) return
    const report = reports.find(r => r.id === reportId)
    if (!report) return
    try {
      await confirmReport(reportId, vote, userPos.lat, userPos.lng, report.latitude, report.longitude)
    } catch (err: any) {
      console.warn('Vote error:', err.message)
    }
  }

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setAccuracy(pos.coords.accuracy) },
        err => console.warn('GPS error:', err),
        { enableHighAccuracy: true }
      )
      const id = navigator.geolocation.watchPosition(
        pos => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setAccuracy(pos.coords.accuracy) },
        null,
        { enableHighAccuracy: true, maximumAge: 5000 }
      )
      return () => navigator.geolocation.clearWatch(id)
    }
  }, [])

  const handleRecenter = useCallback((map: L.Map) => {
    if (userPos) map.setView([userPos.lat, userPos.lng], 15, { animate: true })
  }, [userPos])

  const handleStartReport = () => {
    if (!user) { navigate('/login'); return }
    setSelectMode(true)
    setSelectedPoint(null)
  }

  const handleMapClick = (latlng: L.LatLng) => {
    if (!selectMode) return
    setSelectedPoint({ lat: latlng.lat, lng: latlng.lng })
  }

  const handleConfirmPoint = () => {
    if (selectedPoint) {
      setSelectMode(false)
      setShowModal(true)
    }
  }

  const center = userPos || { lat: -16.5, lng: -68.15 }

  const userIcon = L.divIcon({
    className: '',
    html: `<div style="position:relative;width:16px;height:16px"><div style="width:16px;height:16px;background:#0ea5e9;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #0ea5e9"></div><div style="position:absolute;inset:-12px;border-radius:50%;background:#0ea5e940;animation:pulse-ring 1.5s infinite"></div></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })

  return (
    <div className="h-full w-full relative">
      {!connected && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[2000] bg-amber-500/90 text-white text-xs px-4 py-1.5 rounded-full shadow-lg">
          Reconectando...
        </div>
      )}

      {selectMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[2000] bg-celeste-500/90 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <Crosshair size={14} />
          Toca el mapa para colocar el reporte
        </div>
      )}

      <MapContainer center={[center.lat, center.lng]} zoom={14} className="h-full w-full" zoomControl={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />

        <MapClickHandler onMapClick={handleMapClick} active={selectMode} />
        <RecenterButton onRecenter={handleRecenter} />
        <HeatmapLayer />

        {userPos && (
          <>
            <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>Tu ubicación</strong>
                  <div className="text-xs text-slate-400">±{Math.round(accuracy)}m precisión</div>
                </div>
              </Popup>
            </Marker>
            {!selectMode && (
              <Circle center={[userPos.lat, userPos.lng]} radius={accuracy} pathOptions={{ color: '#0ea5e9', fillOpacity: 0.08, weight: 1 }} />
            )}
          </>
        )}

        {selectedPoint && (
          <Marker position={[selectedPoint.lat, selectedPoint.lng]} icon={selectIcon}>
            <Popup><div className="text-sm font-medium text-celeste-600">Ubicación seleccionada</div></Popup>
          </Marker>
        )}

        {!selectMode && reports.map(r => {
          const cfg = EVENT_CONFIG[r.type]
          const isConfirmed = r.status === 'confirmed'
          return (
            <Marker
              key={r.id}
              position={[r.latitude, r.longitude]}
              icon={createMarkerIcon(cfg?.color || '#ef4444', cfg?.icon || '!', isConfirmed)}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <span>{cfg?.icon}</span>
                    <span style={{ color: cfg?.color }}>{cfg?.label || r.type}</span>
                    {isConfirmed && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Verificado</span>}
                  </div>
                  {r.description && <p className="text-slate-600 text-xs mb-2">{r.description}</p>}
                  {r.user_alias && (
                    <button onClick={() => navigate(`/user/${r.user_id}`)}
                      className="text-[10px] text-celeste-500 hover:underline mb-1 block">
                      Por {r.user_alias}
                    </button>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                    <span>Confianza: {Math.round(r.confidence_score * 100)}%</span>
                    <span>·</span>
                    <span>{r.confirmations} conf.</span>
                    <span>·</span>
                    <span className={r.status === 'active' ? 'text-amber-500' : r.status === 'confirmed' ? 'text-green-500' : 'text-slate-400'}>{r.status}</span>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-dark-700">
                    <button onClick={() => handleConfirm(r.id, 'confirm')}
                      className="flex-1 text-xs bg-celeste-50 hover:bg-celeste-100 text-celeste-700 py-1.5 rounded-lg font-medium transition-colors">Confirmar</button>
                    <button onClick={() => handleConfirm(r.id, 'dispute')}
                      className="flex-1 text-xs bg-danger/5 hover:bg-danger/10 text-danger py-1.5 rounded-lg font-medium transition-colors">Disputar</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {selectMode && selectedPoint ? (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] flex gap-3">
          <button onClick={() => { setSelectMode(false); setSelectedPoint(null) }}
            className="flex-1 bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-200 py-3.5 rounded-2xl font-semibold shadow-lg border border-slate-200 dark:border-dark-600 hover:bg-slate-50 dark:hover:bg-dark-700">
            Cancelar
          </button>
          <button onClick={handleConfirmPoint}
            className="flex-1 bg-gradient-to-r from-celeste-500 to-celeste-600 text-white py-3.5 rounded-2xl font-semibold shadow-lg hover:from-celeste-600 hover:to-celeste-700">
            Reportar aquí
          </button>
        </div>
      ) : selectMode ? (
        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <button onClick={() => { setSelectMode(false); setSelectedPoint(null) }}
            className="w-full bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-200 py-3.5 rounded-2xl font-semibold shadow-lg border border-slate-200 dark:border-dark-600 flex items-center justify-center gap-2">
            <X size={18} /> Cancelar
          </button>
        </div>
      ) : (
        <>
          <button onClick={handleStartReport}
            className="absolute bottom-4 right-4 z-[1000] w-14 h-14 bg-gradient-to-br from-celeste-500 to-celeste-600 hover:from-celeste-600 hover:to-celeste-700 text-white rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-95 shadow-celeste-200">
            <Plus size={28} />
          </button>

          <button onClick={() => { if (!user) { navigate('/login'); return }; navigate('/rutas') }}
            className="absolute bottom-4 right-20 z-[1000] bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium transition-all active:scale-95 border border-slate-200 dark:border-dark-600 hover:bg-slate-50 dark:hover:bg-dark-700">
            <Navigation size={18} className="text-celeste-500" />
            Ir
          </button>
        </>
      )}

      {userPos && !selectMode && (
        <div className={`absolute top-3 bg-white/90 dark:bg-dark-800/90 backdrop-blur-sm rounded-xl px-3 py-2 text-xs shadow-lg border border-slate-200 dark:border-dark-600 transition-all duration-300 ${sidebarOpen ? 'left-72 z-40' : 'left-3 z-[1000]'}`}>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-dark-200">
            <MapPin size={12} />
            <span>{userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)}</span>
          </div>
          <div className="text-slate-400 dark:text-dark-400">±{Math.round(accuracy)}m · {reports.length} eventos {connected ? '· En vivo' : ''}</div>
        </div>
      )}

      {showModal && selectedPoint && (
        <EventModal
          onClose={() => { setShowModal(false); setSelectedPoint(null) }}
          selectedPosition={selectedPoint}
          userPosition={userPos}
          userAccuracy={accuracy}
          onReportCreated={() => {
            setShowModal(false)
            setSelectedPoint(null)
            getReports().then(data => setReports(data.reports || [])).catch(console.warn)
          }}
        />
      )}
    </div>
  )
}
