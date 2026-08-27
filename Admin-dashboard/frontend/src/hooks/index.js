// ─────────────────────────────────────────────────────────────────────────────
// DATA HOOKS — thin wrappers over the api/ surface with loading/error state.
// Same useAsync pattern as the User-Dashboard's hooks/index.js. Pages use these
// instead of calling the API imperatively or reading seed data directly.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import * as api from '../api'

// Generic async-resource hook.
function useAsync(fn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    Promise.resolve(fn())
      .then((res) => { if (alive) setData(res) })
      .catch((err) => { if (alive) setError(err) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadTick])

  const reload = useCallback(() => setReloadTick((t) => t + 1), [])
  return { data, loading, error, reload }
}

// ── Site / blocks / lots (same shape as the User-Dashboard) ─────────────────
export function useSite() {
  return useAsync(() => api.getSite(), [])
}

export function useBlocks() {
  const { data, loading, error } = useAsync(() => api.getBlocks(), [])
  return { blocks: data || [], loading, error }
}

export function useBlock(blockId) {
  const { data, loading, error } = useAsync(() => api.getBlock(blockId), [blockId])
  return { block: data, loading, error }
}

export function useLots(blockId) {
  const { data, loading, error, reload } = useAsync(
    () => (blockId ? api.getLots(blockId) : Promise.resolve([])),
    [blockId],
  )
  return { lots: data || [], loading, error, reload }
}

export function usePricing() {
  const { data, loading, error } = useAsync(() => api.getPricing(), [])
  return { pricing: data, loading, error }
}

export function useLegend() {
  const { data, loading, error } = useAsync(() => api.getLegend(), [])
  return { legend: data || [], loading, error }
}

// ── Admin dashboard ───────────────────────────────────────────────────────────
export function useDashboardMetrics() {
  const { data, loading, error } = useAsync(() => api.getDashboardMetrics(), [])
  return { metrics: data, loading, error }
}

export function useBlockOccupancy() {
  const { data, loading, error } = useAsync(() => api.getBlockOccupancy(), [])
  return { occupancy: data || [], loading, error }
}

// ── Site users ────────────────────────────────────────────────────────────────
export function useUsers() {
  const { data, loading, error, reload } = useAsync(() => api.getUsers(), [])
  return { users: data || [], loading, error, reload }
}

// ── Admin staff ───────────────────────────────────────────────────────────────
export function useAdminStaff() {
  const { data, loading, error, reload } = useAsync(() => api.getAdminStaff(), [])
  return { staff: data || [], loading, error, reload }
}

// ── Memorial moderation ───────────────────────────────────────────────────────
export function useMemorialQueue() {
  const { data, loading, error, reload } = useAsync(() => api.getMemorialQueue(), [])
  return { queue: data || [], loading, error, reload }
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function useNotifications() {
  const { data, loading, error, reload } = useAsync(() => api.getNotifications(), [])
  return {
    sent: data?.sent || [],
    stats: data?.stats || null,
    alerts: data?.alerts || [],
    loading, error, reload,
  }
}
