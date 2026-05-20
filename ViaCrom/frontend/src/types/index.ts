export type EventType =
  | 'bloqueo'
  | 'marcha'
  | 'accidente'
  | 'accidente_vehicular'
  | 'conflicto'
  | 'ruta_cerrada'
  | 'peligro'
  | 'incendio'
  | 'inundacion'
  | 'manifestacion'
  | 'cierre_calle'
  | 'evento_especial'
  | 'otro'

export type ReportStatus = 'active' | 'confirmed' | 'expired' | 'disputed'

export type UserRole =
  | 'super_admin'
  | 'sistema'
  | 'admin_regional'
  | 'moderador'
  | 'verificador'
  | 'premium'
  | 'usuario'
  | 'observador'

export interface Report {
  id: string
  type: EventType
  latitude: number
  longitude: number
  description?: string
  photo_path?: string
  confidence_score: number
  confirmations: number
  status: ReportStatus
  created_at: string
  expires_at: string
  user_id: string
  user_alias?: string
}

export interface User {
  id: string
  alias?: string
  phone?: string
  reputation_score: number
  role: UserRole
  created_at: string
}

export interface Trip {
  id: string
  origin_lat: number
  origin_lng: number
  dest_lat: number
  dest_lng: number
  status: 'active' | 'completed' | 'cancelled'
  started_at: string
  ended_at?: string
}

export interface Route {
  index: number
  distance: number
  duration: number
  geometry: { latitude: number; longitude: number }[]
  blockages_on_route: Report[]
  source?: 'local' | 'osrm'
}

export interface LiveLocation {
  user_id: string
  latitude: number
  longitude: number
  speed: number
  heading: number
  trip_id?: string
}

export const EVENT_CONFIG: Record<EventType, { color: string; bg: string; icon: string; label: string }> = {
  bloqueo:               { color: '#ef4444', bg: '#fef2f2', icon: '🚫', label: 'Bloqueo' },
  marcha:                { color: '#8b5cf6', bg: '#f5f3ff', icon: '🚶', label: 'Marcha' },
  accidente:             { color: '#f97316', bg: '#fff7ed', icon: '💥', label: 'Accidente' },
  accidente_vehicular:   { color: '#dc2626', bg: '#fef2f2', icon: '🚗', label: 'Accidente Vehicular' },
  conflicto:             { color: '#f59e0b', bg: '#fefce8', icon: '⚡', label: 'Conflicto' },
  ruta_cerrada:          { color: '#64748b', bg: '#f8fafc', icon: '🚧', label: 'Ruta Cerrada' },
  peligro:               { color: '#eab308', bg: '#fefce8', icon: '⚠️', label: 'Peligro' },
  incendio:              { color: '#b91c1c', bg: '#fef2f2', icon: '🔥', label: 'Incendio' },
  inundacion:            { color: '#0ea5e9', bg: '#f0f9ff', icon: '🌊', label: 'Inundación' },
  manifestacion:         { color: '#a855f7', bg: '#f5f3ff', icon: '📢', label: 'Manifestación' },
  cierre_calle:          { color: '#ef4444', bg: '#fef2f2', icon: '⛔', label: 'Cierre de Calle' },
  evento_especial:       { color: '#ec4899', bg: '#fdf2f8', icon: '🎯', label: 'Evento Especial' },
  otro:                  { color: '#94a3b8', bg: '#f8fafc', icon: '📌', label: 'Otro' },
}

export const EVENT_TYPES = Object.keys(EVENT_CONFIG) as EventType[]

export const EVENT_COLORS: Record<string, string> = {}
export const EVENT_LABELS: Record<string, string> = {}
EVENT_TYPES.forEach(t => {
  EVENT_COLORS[t] = EVENT_CONFIG[t].color
  EVENT_LABELS[t] = EVENT_CONFIG[t].label
})

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  sistema: 90,
  admin_regional: 80,
  moderador: 60,
  verificador: 40,
  premium: 30,
  usuario: 20,
  observador: 5,
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  sistema: 'Sistema',
  admin_regional: 'Admin Regional',
  moderador: 'Moderador',
  verificador: 'Verificador',
  premium: 'Premium',
  usuario: 'Usuario',
  observador: 'Observador',
}

export const ROLE_WEIGHTS: Record<UserRole, number> = {
  super_admin: 10,
  sistema: 8,
  admin_regional: 6,
  moderador: 5,
  verificador: 3,
  premium: 2,
  usuario: 1,
  observador: 0,
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export function canModerate(role: UserRole): boolean {
  return hasPermission(role, 'moderador')
}

export function canVerify(role: UserRole): boolean {
  return hasPermission(role, 'verificador')
}

export function isStaff(role: UserRole): boolean {
  return hasPermission(role, 'moderador')
}
