import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { api } from '../lib/api'
import { ErrorNotice, Loading } from '../components/Feedback'

export const AuthContext = createContext({ user: null, loading: false })
export const useAuth = () => useContext(AuthContext)
export const landing = (user) => user?.role === 'admin' ? '/admin' : user?.role === 'seller' ? '/dashboard' : '/auctions'
export const manages = (user, item) => user?.role === 'admin' || (user?.role === 'seller' && user._id === item.sellerId)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const sequence = useRef(0)
  const controller = useRef(null)
  const refresh = useCallback(async () => {
    const current = ++sequence.current
    controller.current?.abort()
    controller.current = new AbortController()
    setError(null)
    try { const response = await api('/auth/me', { signal: controller.current.signal }); if (current === sequence.current) setUser(response.data) }
    catch (failure) { if (failure.name !== 'AbortError' && current === sequence.current) setError(failure) }
    finally { if (current === sequence.current) setLoading(false) }
  }, [])
  useEffect(() => { refresh(); const timer = setInterval(refresh, 60000); return () => { clearInterval(timer); ++sequence.current; controller.current?.abort() } }, [refresh])
  async function authenticate(path, body) {
    const response = await api(`/auth/${path}`, { method: 'POST', body })
    ++sequence.current; controller.current?.abort(); setLoading(false); setUser(response.data); setError(null); return response.data
  }
  async function logout() { await api('/auth/logout', { method: 'POST' }); ++sequence.current; controller.current?.abort(); setUser(null); setError(null); setLoading(false) }
  return <AuthContext.Provider value={{ user, loading, error, refresh, authenticate, logout, setUser }}>{children}</AuthContext.Provider>
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
