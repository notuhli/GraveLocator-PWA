// ─────────────────────────────────────────────────────────────────────────────
// APP CONTEXT — auth + lightweight app state.
// When VITE_USE_REMOTE=true, auth is backed by Supabase Auth (real sessions,
// persisted across reloads). Otherwise it falls back to the original local
// stub (login() just flips a flag) so the app still runs with zero setup.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react'
import { ENV } from '../config/constants'
import { supabase } from '../api/supabaseClient'
import * as api from '../api'

const AppContext = createContext(null)

// Demo-mode login survives a refresh (Supabase keeps its own session when remote).
const LOCAL_USER_KEY = 'gl:session'
function loadLocalUser() {
  if (ENV.USE_REMOTE) return null
  try { return JSON.parse(localStorage.getItem(LOCAL_USER_KEY)) } catch { return null }
}
function saveLocalUser(u) {
  try { u ? localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u)) : localStorage.removeItem(LOCAL_USER_KEY) } catch { /* ignore */ }
}

// Recently viewed is stored per user on this device, newest first.
const RECENT_LIMIT = 5
const recentKey = (userKey) => `gl:recent:${userKey || 'guest'}`
function loadRecent(userKey) {
  try { return JSON.parse(localStorage.getItem(recentKey(userKey))) || [] } catch { return [] }
}
function saveRecent(userKey, list) {
  try { localStorage.setItem(recentKey(userKey), JSON.stringify(list)) } catch { /* storage full / blocked */ }
}

const DEFAULT_USER = {
  name: 'Maria Santos',
  email: 'm.santos@email.com',
  phone: '+63 912 345 6789',
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(loadLocalUser) // null = logged out
  const [authLoading, setAuthLoading] = useState(ENV.USE_REMOTE)
  const [activeBlockId, setActiveBlockId] = useState(null) // map: which block is open
  const [activeLot, setActiveLot] = useState(null)         // map → plot-detail handoff
  const [reservationDraft, setReservationDraft] = useState(null) // reserve-form → summary handoff
  const [activeReservationId, setActiveReservationId] = useState(null) // reservation list → detail handoff
  const [recentViews, setRecentViews] = useState([])

  // Stable id for per-user data: Supabase id when remote, email in local-stub mode.
  const userKey = user?.id || user?.email || null

  useEffect(() => { setRecentViews(loadRecent(userKey)) }, [userKey])

  // entry: { type: 'lot' | 'block', blockId, blockName, lawnName, lotNo?, lot? }
  const addRecentView = useCallback((entry) => {
    if (!entry?.blockId) return
    setRecentViews((prev) => {
      const id = entry.type === 'lot' ? `lot:${entry.blockId}:${entry.lotNo}` : `block:${entry.blockId}`
      // Opening a block you already viewed a lot in (e.g. going back to the grid) doesn't bump it.
      if (entry.type === 'block' && prev.some((r) => r.type === 'lot' && r.blockId === entry.blockId)) return prev
      let rest = prev.filter((r) => r.id !== id)
      // A lot view makes the plain "opened this block" entry redundant.
      if (entry.type === 'lot') rest = rest.filter((r) => r.id !== `block:${entry.blockId}`)
      const next = [{ ...entry, id, viewedAt: Date.now() }, ...rest].slice(0, RECENT_LIMIT)
      saveRecent(userKey, next)
      return next
    })
  }, [userKey])

  const clearRecentViews = useCallback(() => { saveRecent(userKey, []); setRecentViews([]) }, [userKey])

  // Every path into Lot Details (map, search, deep link) sets activeLot — record it here.
  useEffect(() => {
    if (!activeLot?.blockId || activeLot.lotNo == null) return
    addRecentView({
      type: 'lot', blockId: activeLot.blockId, blockName: activeLot.blockName,
      lawnName: activeLot.lawnName, lotNo: activeLot.lotNo, lot: activeLot,
    })
  }, [activeLot, addRecentView])

  function toUser(u) {
    return {
      id: u.id,
      name: u.user_metadata?.full_name || DEFAULT_USER.name,
      email: u.email,
      phone: u.user_metadata?.phone || '',
    }
  }

  // Restore + subscribe to the Supabase session when running against real auth.
  useEffect(() => {
    if (!ENV.USE_REMOTE || !supabase) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session ? toUser(session.user) : null)
      setAuthLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? toUser(session.user) : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo(() => ({
    user,
    userKey,
    isAuthenticated: !!user,
    authLoading,

    // Local-stub login (used when VITE_USE_REMOTE=false).
    login: (profile) => { const u = { ...DEFAULT_USER, ...(profile || {}) }; saveLocalUser(u); setUser(u) },
    logout: () => { saveLocalUser(null); setUser(null) },

    // Real Supabase auth — call these from the login/signup screens when remote.
    signIn: async ({ email, password }) => {
      await api.signIn({ email, password })
    },
    signUp: async ({ email, password, fullName, phone }) => {
      // Return whether a real session came back — if email confirmation is
      // required, Supabase creates the account but does NOT log them in yet.
      const data = await api.signUp({ email, password, fullName, phone })
      return { confirmedImmediately: !!data.session }
    },
    signOut: async () => {
      await api.signOut()
    },
    resendConfirmation: async (email) => {
      await api.resendConfirmation(email)
    },
    verifySignupCode: async (email, token) => {
      await api.verifySignupCode(email, token)
    },
    updateProfile: async ({ fullName, phone }) => {
      if (!ENV.USE_REMOTE) { setUser((u) => { const n = { ...u, name: fullName, phone }; saveLocalUser(n); return n }); return }
      const data = await api.updateProfile({ fullName, phone })
      setUser(toUser(data.user))
    },
    changePassword: async (newPassword) => {
      if (!ENV.USE_REMOTE) return // no real auth in local-stub mode
      await api.changePassword(newPassword)
    },

    activeBlockId,
    setActiveBlockId,
    activeLot,
    setActiveLot,
    reservationDraft,
    setReservationDraft,
    activeReservationId,
    setActiveReservationId,
    recentViews,
    addRecentView,
    clearRecentViews,
  }), [user, userKey, authLoading, activeBlockId, activeLot, reservationDraft, activeReservationId, recentViews, addRecentView, clearRecentViews])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within <AppProvider>')
  return ctx
}

export default AppContext