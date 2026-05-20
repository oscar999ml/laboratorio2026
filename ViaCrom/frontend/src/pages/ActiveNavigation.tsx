import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { ArrowLeft, Navigation, ChevronRight, MapPin, AlertTriangle } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { endTrip } from '../lib/api'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'

const SOCKET_URL = 'http://localhost:3000'

export default function ActiveNavigation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tripId = searchParams.get('trip')
  const { user } = useAuth()
  const { connected, on, off, joinTrip, leaveTrip } = useSocket()

  const [eta, setEta] = useState<number | null>(null)
  const [remainingKm, setRemainingKm] = useState<number | null>(null)
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [instruction, setInstruction] = useState('Preparando navegación...')
  const [ending, setEnding] = useState(false)
  const intervalRef = useRef<number | null>(null)

  const tripCoordsRef = useRef<[number, number][]>([])

  useEffect(() => {
    if (tripId) joinTrip(tripId)
    return () => {
      if (tripId) leaveTrip(tripId)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [tripId])

  useEffect(() => {
    const handlerEta = (data: any) => {
      if (data.trip_id === tripId) {
        setEta(data.eta_minutes)
        setRemainingKm(data.remaining_km)
      }
    }
    const handlerWarning = (data: any) => {
      if (data.user_id === user?.id && data.warnings?.length > 0) {
        setInstruction(`Precaución: ${data.warnings.length} evento(s) cerca`)
      }
    }
    on('eta-update', handlerEta)
    on('proximity-warning', handlerWarning)
    return () => {
      off('eta-update', handlerEta)
      off('proximity-warning', handlerWarning)
    }
  }, [tripId, user?.id])

  useEffect(() => {
    if ('geolocation' in navigator) {
      const id = navigator.geolocation.watchPosition(
        pos => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setUserPos({ lat, lng })
          setCurrentSpeed(pos.coords.speed || 0)

          tripCoordsRef.current.push([lat, lng])

          if (tripId && user) {
            fetch(`${SOCKET_URL}/api/tracking/update`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('viacrom-token')}`
              },
              body: JSON.stringify({
                latitude: lat,
                longitude: lng,
                speed: pos.coords.speed || 0,
                heading: pos.coords.heading || 0,
                trip_id: tripId,
              })
            }).catch(() => {})
          }
        },
        null,
        { enableHighAccuracy: true, maximumAge: 2000 }
      )
      return () => navigator.geolocation.clearWatch(id)
    }
  }, [tripId, user])

  const handleEndTrip = async () => {
    if (!tripId) {
      navigate('/')
      return
    }
    setEnding(true)
    try {
      await endTrip(tripId)
    } catch (err: any) {
      console.warn('End trip error:', err.message)
    }
    if (tripId) leaveTrip(tripId)
    navigate('/')
  }

  const userIcon = L.divIcon({
    className: '',
    html: '<div style="position:relative"><div style="width:16px;height:16px;background:#0ea5e9;border-radius:50%;border:3px solid white;box-shadow:0 0 4px rgba(14,165,233,0.5)"></div><div style="position:absolute;inset:-10px;border-radius:50%;background:#0ea5e940;animation:pulse-ring 1.5s infinite"></div></div>',
    iconSize: [16, 16], iconAnchor: [8, 8],
  })

  const mapCenter: [number, number] = userPos ? [userPos.lat, userPos.lng] : [-16.5, -68.14]
  const displayPath = tripCoordsRef.current.length > 0 ? tripCoordsRef.current : [[-16.5, -68.14], [-16.5, -68.13]] as [number, number][]

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gradient-to-r from-celeste-500 to-celeste-600 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/')} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <div className="text-2xl font-bold">{eta !== null ? `${eta} min` : '...'}</div>
            <div className="text-xs text-white/70">{remainingKm !== null ? `${remainingKm.toFixed(1)} km restantes` : 'Calculando...'}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">{Math.round(currentSpeed * 3.6)} km/h</div>
            <div className="text-xs text-white/70">Velocidad</div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer center={mapCenter} zoom={15} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {userPos && <Marker position={[userPos.lat, userPos.lng]} icon={userIcon} />}
          {displayPath.length > 1 && (
            <Polyline positions={displayPath} color="#0ea5e9" weight={5} opacity={0.9} />
          )}
        </MapContainer>

        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-dark-800 rounded-xl px-4 py-2 shadow-lg border border-slate-200 dark:border-dark-600 text-sm font-medium flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Navigation size={16} className="text-celeste-500" />
          <span className="truncate max-w-[200px]">{instruction}</span>
          <ChevronRight size={16} className="text-slate-400 shrink-0" />
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white dark:bg-dark-800 rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-dark-600 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-amber-500'}`} />
            <span>{connected ? 'En vivo' : 'Reconectando...'}</span>
            {userPos && <span className="ml-auto">±{Math.round(currentSpeed * 3.6)} km/h</span>}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin size={14} />
              {userPos ? `${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)}` : 'Buscando GPS...'}
            </div>
            <button onClick={handleEndTrip} disabled={ending}
              className="bg-danger hover:bg-danger/90 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-60">
              {ending ? 'Finalizando...' : 'Finalizar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
