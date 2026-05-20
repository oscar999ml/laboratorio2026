import { useState, useEffect } from 'react'
import { Search, MoreHorizontal, Shield, Ban, UserCheck, LogOut, Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import AdminSidebar from '../../components/AdminSidebar'
import { getUsers, changeUserRole, banUser, unbanUser } from '../../lib/admin'
import { ROLE_LABELS, ROLE_HIERARCHY } from '../../types'
import type { UserRole } from '../../types'

const ROLES = ['usuario', 'premium', 'verificador', 'moderador', 'admin_regional', 'sistema', 'super_admin'] as const

export default function AdminUsers() {
  const { theme, toggle } = useTheme()
  const { user: authUser, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')

  const fetchUsers = () => {
    setLoading(true)
    getUsers({ search: search || undefined })
      .then(data => {
        setUsers(data.users || [])
        setTotal(data.total || 0)
      })
      .catch(console.warn)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300)
    return () => clearTimeout(t)
  }, [search])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await changeUserRole(userId, newRole)
      setActionMsg('Rol actualizado')
      fetchUsers()
    } catch (err: any) {
      setActionMsg(err.message)
    }
    setTimeout(() => setActionMsg(''), 2500)
  }

  const handleBan = async (userId: string, currentlyBanned: boolean) => {
    try {
      if (currentlyBanned) {
        await unbanUser(userId)
        setActionMsg('Usuario rehabilitado')
      } else {
        await banUser(userId)
        setActionMsg('Usuario suspendido')
      }
      fetchUsers()
    } catch (err: any) {
      setActionMsg(err.message)
    }
    setTimeout(() => setActionMsg(''), 2500)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-900 flex">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-slate-200 dark:border-dark-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg">
              <Menu size={20} className="text-slate-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">Usuarios</h1>
              <p className="text-xs text-slate-400">{total} usuarios registrados</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:block">{authUser?.alias}</span>
            <button onClick={toggle} className="p-2 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-xl transition-colors">
              {theme === 'dark' ? <Sun size={18} className="text-slate-400" /> : <Moon size={18} className="text-slate-400" />}
            </button>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-dark-700 rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-dark-600 transition-colors text-slate-600 dark:text-slate-300">
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </header>

        <div className="p-6">
          {actionMsg && (
            <div className="mb-4 px-4 py-2 bg-celeste-50 dark:bg-celeste-900/20 text-celeste-700 dark:text-celeste-300 rounded-xl text-sm">
              {actionMsg}
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-dark-700">
              <div className="flex items-center bg-slate-50 dark:bg-dark-700 rounded-xl px-3 py-2 max-w-md">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input type="text" placeholder="Buscar por usuario, nombre o celular..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm px-2 text-slate-800 dark:text-slate-200 placeholder:text-slate-400" />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">Cargando...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">Sin usuarios</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-100 dark:border-dark-700">
                      <th className="text-left p-4 font-medium">Usuario</th>
                      <th className="text-left p-4 font-medium">Nombres</th>
                      <th className="text-left p-4 font-medium">Celular</th>
                      <th className="text-left p-4 font-medium">Rol</th>
                      <th className="text-left p-4 font-medium">Reputación</th>
                      <th className="text-left p-4 font-medium">Reportes</th>
                      <th className="text-left p-4 font-medium">Estado</th>
                      <th className="text-right p-4 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-700">
                    {users.map((u: any) => {
                      const canEdit = authUser && (ROLE_HIERARCHY[authUser.role as UserRole] || 0) > (ROLE_HIERARCHY[u.role as UserRole] || 0)
                      return (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-dark-700/50 transition-colors">
                          <td className="p-4">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{u.alias || '—'}</span>
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-300">{(u.nombres || '') + ' ' + (u.apellidos || '') || '—'}</td>
                          <td className="p-4 font-mono text-xs text-slate-500">{u.phone || '—'}</td>
                          <td className="p-4">
                            {canEdit ? (
                              <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                                className="text-xs bg-slate-100 dark:bg-dark-700 rounded-lg px-2 py-1 outline-none text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-600">
                                {ROLES.map(r => (
                                  <option key={r} value={r} disabled={r === 'super_admin' && u.role === 'super_admin'}>
                                    {ROLE_LABELS[r as UserRole] || r}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                {ROLE_LABELS[u.role as UserRole] || u.role}
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-200 dark:bg-dark-600 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-success" style={{ width: `${(u.reputation_score || 0) * 100}%` }} />
                              </div>
                              <span className="text-xs text-slate-500">{(u.reputation_score || 0).toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-300">{u.total_reports || 0}</td>
                          <td className="p-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              u.is_banned ? 'bg-danger/10 text-danger' :
                              u.is_active ? 'bg-success/10 text-success' :
                              'bg-slate-100 dark:bg-dark-600 text-slate-400'
                            }`}>
                              {u.is_banned ? 'Suspendido' : u.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canEdit && (
                                <>
                                  <button onClick={() => handleBan(u.id, u.is_banned)}
                                    className="p-1.5 hover:bg-danger/10 rounded-lg" title={u.is_banned ? 'Rehabilitar' : 'Suspender'}>
                                    {u.is_banned ? <UserCheck size={14} className="text-success" /> : <Ban size={14} className="text-danger" />}
                                  </button>
                                  <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg">
                                    <MoreHorizontal size={14} className="text-slate-400" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
