const API = 'http://localhost:3000'

async function authFetch(path: string, opts?: RequestInit) {
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
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export function getDashboard() {
  return authFetch('/api/admin/dashboard')
}

export function getUsers(params?: { search?: string; role?: string; page?: number }) {
  const q = new URLSearchParams()
  if (params?.search) q.set('search', params.search)
  if (params?.role) q.set('role', params.role)
  if (params?.page) q.set('page', String(params.page))
  return authFetch(`/api/admin/users?${q.toString()}`)
}

export function changeUserRole(userId: string, role: string) {
  return authFetch(`/api/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  })
}

export function banUser(userId: string, reason?: string) {
  return authFetch(`/api/admin/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function unbanUser(userId: string) {
  return authFetch(`/api/admin/users/${userId}/unban`, { method: 'POST' })
}

export function getAdminReports(params?: { status?: string; type?: string; page?: number }) {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.type) q.set('type', params.type)
  if (params?.page) q.set('page', String(params.page))
  return authFetch(`/api/admin/reports?${q.toString()}`)
}

export function moderateReport(reportId: string, action: 'approve' | 'reject' | 'hide') {
  return authFetch(`/api/admin/reports/${reportId}/moderate`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

export function getAnalytics(days?: number) {
  return authFetch(`/api/admin/analytics?days=${days || 7}`)
}

export function getLogs(page?: number) {
  return authFetch(`/api/admin/logs?page=${page || 1}`)
}

export function getSettings() {
  return authFetch('/api/admin/settings')
}

export function updateSettings(settings: Record<string, number>) {
  return authFetch('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}
