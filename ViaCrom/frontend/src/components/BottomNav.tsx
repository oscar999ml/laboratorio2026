import { useNavigate, useLocation } from 'react-router-dom'
import { Map, ListTodo, Route, Activity, User } from 'lucide-react'

const tabs = [
  { path: '/', icon: Map, label: 'Mapa' },
  { path: '/reportes', icon: ListTodo, label: 'Reportes' },
  { path: '/rutas', icon: Route, label: 'Rutas' },
  { path: '/actividad', icon: Activity, label: 'Actividad' },
  { path: '/perfil', icon: User, label: 'Perfil' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="sticky bottom-0 z-40 glass border-t border-slate-200/80">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2">
        {tabs.map(tab => {
          const active = location.pathname === tab.path
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 py-2 px-4 transition-all relative ${
                active ? 'text-celeste-500' : 'text-slate-400 hover:text-slate-600'
              }`}>
              <tab.icon size={19} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {active && <span className="absolute -top-0.5 w-6 h-0.5 bg-celeste-500 rounded-full" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
