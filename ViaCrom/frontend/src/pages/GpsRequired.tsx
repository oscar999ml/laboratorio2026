import { useState } from 'react'
import { MapPin, Navigation, Shield, Info } from 'lucide-react'

export default function GpsRequired({ onAllow }: { onAllow: () => void }) {
  const [showInfo, setShowInfo] = useState(false)

  const handleActivate = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => onAllow(),
        () => {},
        { enableHighAccuracy: true }
      )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-celeste-50 via-white to-celeste-100 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-celeste-200 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-celeste-100 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-md animate-fade-in">
        <div className="relative inline-flex mb-8">
          <div className="w-24 h-24 rounded-full bg-celeste-100 flex items-center justify-center animate-float">
            <MapPin size={48} className="text-celeste-500" />
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-celeste-200 rounded-full flex items-center justify-center animate-pulse">
            <Navigation size={20} className="text-celeste-600" />
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-2 text-celeste-700">
          NaviCrom
        </h1>
        <p className="text-slate-500 mb-2 text-sm">Rutas inteligentes, comunidad informada</p>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-celeste-100 shadow-lg">
          <Shield size={24} className="text-celeste-500 mx-auto mb-3" />
          <p className="text-lg font-semibold text-slate-800 mb-2">
            Esta plataforma requiere acceso a tu ubicación
          </p>
          <p className="text-sm text-slate-500">
            Necesitamos tu GPS para mostrarte bloqueos cercanos, calcular rutas seguras y validar reportes en tu zona.
          </p>
        </div>

        <button
          onClick={handleActivate}
          className="w-full py-4 bg-gradient-to-r from-celeste-500 to-celeste-600 hover:from-celeste-600 hover:to-celeste-700 text-white rounded-2xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-celeste-200 hover:shadow-xl active:scale-[0.98]"
        >
          Activar GPS
        </button>

        <button
          onClick={() => setShowInfo(!showInfo)}
          className="mt-4 text-sm text-slate-400 hover:text-celeste-500 transition-colors flex items-center justify-center gap-1.5 mx-auto"
        >
          <Info size={14} />
          ¿Por qué es necesario?
        </button>

        {showInfo && (
          <div className="mt-4 bg-white/70 backdrop-blur-sm rounded-xl p-4 text-xs text-slate-500 text-left space-y-2 animate-fade-in border border-celeste-100">
            <p>📍 <strong className="text-slate-700">Reportes precisos:</strong> Validamos que estés cerca del evento para evitar spam.</p>
            <p>🗺️ <strong className="text-slate-700">Rutas dinámicas:</strong> Calculamos caminos evitando bloqueos en tiempo real.</p>
            <p>🔔 <strong className="text-slate-700">Alertas cercanas:</strong> Te avisamos si hay eventos a tu alrededor.</p>
            <p className="text-slate-400 mt-2">No almacenamos tu ubicación sin tu consentimiento. Puedes desactivar el GPS cuando quieras.</p>
          </div>
        )}

        <p className="mt-8 text-xs text-slate-400">Por el bien común — Sin afiliación política</p>
      </div>
    </div>
  )
}
