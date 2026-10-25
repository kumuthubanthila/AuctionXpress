import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { api } from '../lib/api'
import { ErrorNotice, Loading } from '../components/Feedback'

const Context = createContext({ user: null, loading: false })
export const useAuth = () => useContext(Context)
export const landing = (user) => user?.role === 'admin' ? '/admin' : user?.role === 'seller' ? '/dashboard' : '/auctions'
export const manages = (user, item) => user?.role === 'admin' || (user?.role === 'seller' && user._id === item.sellerId)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  async function refresh() {
    setError(null)
    try { const response = await api('/auth/me'); setUser(response.data) }
    catch (failure) { setError(failure) }
    finally { setLoading(false) }
  }
  useEffect(() => { refresh(); const timer = setInterval(refresh, 60000); return () => clearInterval(timer) }, [])
  async function authenticate(path, body) { const response = await api(`/auth/${path}`, { method: 'POST', body }); setUser(response.data); setError(null); return response.data }
  async function logout() { await api('/auth/logout', { method: 'POST' }); setUser(null) }
  return <Context.Provider value={{ user, loading, error, refresh, authenticate, logout, setUser }}>{children}</Context.Provider>
}
export function Protected({ roles, children }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.loading) return <Loading label="Checking your session…" />
  if (auth.error) return <ErrorNotice error={auth.error} retry={auth.refresh} />
  if (!auth.user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  if (roles && !roles.includes(auth.user.role)) return <Navigate to={landing(auth.user)} replace />
  return children
}
