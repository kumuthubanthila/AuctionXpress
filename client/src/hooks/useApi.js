import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function useApi(path, interval = 0) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ path: null, data: null, error: null, loading: true })
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    setState((old) => ({ path, data: old.path === path ? old.data : null, error: null, loading: true }))
    api(path, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setState({ path, data, error: null, loading: false })
    }).catch((error) => {
      if (!controller.signal.aborted) setState((old) => ({ ...old, error, loading: false }))
    })
    return () => controller.abort()
  }, [path, revision])
  useEffect(() => {
    if (!path || !interval) return
    const timer = setInterval(refresh, interval)
    return () => clearInterval(timer)
  }, [path, interval, refresh])
  return { ...(state.path === path ? state : { data: null, error: null, loading: Boolean(path) }), refresh }
}
