const API = 'http://localhost:3000'

async function request(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('viacrom-token')
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function loginUser(body: { alias?: string; phone?: string; password: string }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function registerUser(body: Record<string, string>) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getProfile() {
  return request('/api/auth/me')
}

export async function updateProfile(body: Record<string, string | undefined>) {
  return request('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function getReports(lat?: number, lng?: number) {
  const params = new URLSearchParams()
  if (lat) params.set('lat', String(lat))
  if (lng) params.set('lng', String(lng))
  const qs = params.toString()
  return request(`/api/bloqueos${qs ? `?${qs}` : ''}`)
}

export async function createReport(data: FormData) {
  const token = localStorage.getItem('viacrom-token')
  const res = await fetch(`${API}/api/bloqueos`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: data,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error' }))
    throw new Error(err.error)
  }
  return res.json()
}

export async function confirmReport(id: string, vote: 'confirm' | 'dispute', lat: number, lng: number, reportLat: number, reportLng: number) {
  return request(`/api/bloqueos/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ vote, latitude: lat, longitude: lng, report_latitude: reportLat, report_longitude: reportLng }),
  })
}

export async function calculateRoute(origin: {lat: number, lng: number}, dest: {lat: number, lng: number}, avoid: {latitude: number, longitude: number, type?: string, radius?: number}[] = [], mode?: 'driving' | 'walking') {
  return request('/api/rutas/calcular', {
    method: 'POST',
    body: JSON.stringify({
      origin_lat: origin.lat, origin_lng: origin.lng,
      dest_lat: dest.lat, dest_lng: dest.lng,
      avoid_coords: avoid,
      mode: mode || 'driving',
    }),
  })
}

export async function startTrip(origin: {lat: number, lng: number}, dest: {lat: number, lng: number}, geometry: any) {
  return request('/api/rutas/iniciar-viaje', {
    method: 'POST',
    body: JSON.stringify({
      latitude: origin.lat, longitude: origin.lng,
      dest_lat: dest.lat, dest_lng: dest.lng,
      route_geometry: JSON.stringify(geometry),
    }),
  })
}

export async function endTrip(id: string) {
  return request(`/api/rutas/finalizar-viaje/${id}`, { method: 'POST' })
}
