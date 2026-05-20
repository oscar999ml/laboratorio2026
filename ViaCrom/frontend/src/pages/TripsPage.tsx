import { useState } from 'react'
import { MapPin, Clock, Navigation, MoreHorizontal, Home, Briefcase, BookOpen } from 'lucide-react'

const savedPlaces = [
  { name: 'Casa', icon: Home, address: 'Av. Principal #123' },
  { name: 'Trabajo', icon: Briefcase, address: 'Zona Central, Edif. Corporativo' },
  { name: 'Universidad', icon: BookOpen, address: 'Campus Universitario' },
]

export default function TripsPage() {
  const [tab, setTab] = useState<'active' | 'history' | 'saved'>('saved')

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 scrollbar-hide pb-24">
      <div className="flex gap-1 bg-slate-100 dark:bg-dark-700 rounded-xl p-1">
        {(['saved', 'active', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${tab === t ? 'bg-white dark:bg-dark-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            {t === 'saved' ? 'Guardados' : t === 'active' ? 'Activos' : 'Historial'}
          </button>
        ))}
      </div>

      {tab === 'saved' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Destinos frecuentes</p>
          {savedPlaces.map((place, idx) => (
            <button key={idx} className="w-full card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-celeste-50 dark:bg-celeste-900/30 flex items-center justify-center">
                <place.icon size={20} className="text-celeste-500" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{place.name}</div>
                <div className="text-xs text-slate-400">{place.address}</div>
              </div>
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg transition-colors">
                <MoreHorizontal size={16} className="text-slate-400" />
              </button>
            </button>
          ))}
        </div>
      )}

      {tab === 'active' && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Navigation size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-sm">No hay viajes activos</p>
          <p className="text-xs mt-1">Inicia una ruta desde el mapa</p>
        </div>
      )}

      {tab === 'history' && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Clock size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-sm">Sin historial</p>
          <p className="text-xs mt-1">Tus viajes aparecerán aquí</p>
        </div>
      )}
    </div>
  )
}
