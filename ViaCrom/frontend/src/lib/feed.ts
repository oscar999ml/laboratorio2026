const API = 'http://localhost:3000'

export interface FeedItem {
  id: string
  type: 'report' | 'confirm' | 'trend'
  event_type: string | null
  event_types?: string[]
  user_alias: string | null
  user_id: string | null
  description: string
  location: string
  latitude: number | null
  longitude: number | null
  confidence?: number
  confirmations?: number
  event_count?: number
  distance: number | null
  created_at: string
}

export async function getFeed(lat: number, lng: number, radius = 10000) {
  const res = await fetch(`${API}/api/feed?lat=${lat}&lng=${lng}&radius=${radius}`)
  if (!res.ok) throw new Error('Error al cargar feed')
  return res.json() as Promise<{ items: FeedItem[]; total: number }>
}
