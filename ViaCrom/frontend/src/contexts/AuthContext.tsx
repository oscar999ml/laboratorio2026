import { createContext, useContext, useState } from 'react'
import type { UserRole } from '../types'
import { ROLE_HIERARCHY } from '../types'

interface AuthUser {
  id: string
  alias: string
  nombres?: string
  apellidos?: string
  phone?: string
  email?: string
  pais?: string
  ciudad?: string
  fecha_nac?: string
  photo?: string
  role: UserRole
  reputation_score: number
  is_banned?: number
  is_active?: number
  created_at: string
}

interface AuthContext {
  user: AuthUser | null
  login: (alias: string, phone: string, password: string) => Promise<{ token: string; user: AuthUser }>
  register: (data: Record<string, string>) => Promise<{ token: string; user: AuthUser }>
  logout: () => void
  hasRole: (role: UserRole) => boolean
  isStaff: boolean
}

const AuthContext = createContext<AuthContext>({
  user: null,
  login: async () => { throw new Error('Not initialized') },
  register: async () => { throw new Error('Not initialized') },
  logout: () => {},
  hasRole: () => false,
  isStaff: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('viacrom-user')
    return stored ? JSON.parse(stored) : null
  })

  const login = async (alias: string, phone: string, password: string) => {
    const body: Record<string, string> = { password }
    if (alias) body.alias = alias
    if (phone) body.phone = phone

    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error de conexión' }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    const data = await res.json()
    if (data.user.is_banned) {
      throw new Error('Cuenta suspendida')
    }

    localStorage.setItem('viacrom-token', data.token)
    localStorage.setItem('viacrom-user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const register = async (formData: Record<string, string>) => {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error de registro' }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    const data = await res.json()
    localStorage.setItem('viacrom-token', data.token)
    localStorage.setItem('viacrom-user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('viacrom-token')
    localStorage.removeItem('viacrom-user')
    setUser(null)
  }

  const hasRole = (role: UserRole) => {
    if (!user) return false
    return (ROLE_HIERARCHY[user.role] || 0) >= (ROLE_HIERARCHY[role] || 0)
  }

  const isStaff = user ? hasRole('moderador') : false

  return (
    <AuthContext.Provider value={{ user, login, register, logout, hasRole, isStaff }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
