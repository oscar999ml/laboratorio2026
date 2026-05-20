import { useEffect, useState, useRef, createContext, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import GpsRequired from '../pages/GpsRequired'

interface GpsContext {
  enabled: boolean
  requestPermission: () => void
}

const GpsContext = createContext<GpsContext>({ enabled: false, requestPermission: () => {} })
export const useGps = () => useContext(GpsContext)

const NO_GPS_ROUTES = ['/login', '/registro']

export default function GpsGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [gpsGranted, setGpsGranted] = useState(() => localStorage.getItem('viacrom-gps') === 'true')
  const watchId = useRef<number | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  const isNoGpsRoute = NO_GPS_ROUTES.includes(location.pathname)

  const checkGps = () => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      () => {
        localStorage.setItem('viacrom-gps', 'true')
        setGpsGranted(true)
        setShowPrompt(false)
      },
      () => {
        localStorage.removeItem('viacrom-gps')
        setGpsGranted(false)
        if (!isNoGpsRoute) setShowPrompt(true)
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }

  useEffect(() => {
    if (isNoGpsRoute) {
      setShowPrompt(false)
      return
    }

    checkGps()

    watchId.current = navigator.geolocation.watchPosition(
      () => {
        localStorage.setItem('viacrom-gps', 'true')
        setGpsGranted(true)
        setShowPrompt(false)
      },
      () => {
        localStorage.removeItem('viacrom-gps')
        setGpsGranted(false)
        setShowPrompt(true)
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    )

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [location.pathname])

  const requestPermission = () => checkGps()

  if (showPrompt && !isNoGpsRoute) {
    return <GpsRequired onAllow={() => {
      localStorage.setItem('viacrom-gps', 'true')
      setGpsGranted(true)
      setShowPrompt(false)
    }} />
  }

  return (
    <GpsContext.Provider value={{ enabled: gpsGranted, requestPermission }}>
      {children}
    </GpsContext.Provider>
  )
}
