// ─────────────────────────────────────────────────────────────────────────────
// APP CONTEXT — auth + lightweight app state.
// When VITE_USE_REMOTE=true, auth is backed by Supabase Auth (real sessions,
// persisted across reloads). Otherwise it falls back to the original local
// stub (login() just flips a flag) so the app still runs with zero setup.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { ENV } from '../config/constants'
import { supabase } from '../api/supabaseClient'
import * as api from '../api'

const AppContext = createContext(null)

const DEFAULT_USER = {
  name: 'Maria Santos',
  email: 'm.santos@email.com',
  phone: '+63 912 345 6789',
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)          // null = logged out
  const [authLoading, setAuthLoading] = useState(ENV.USE_REMOTE)
  const [activeBlockId, setActiveBlockId] = useState(null) // map: which block is open
  const [activeLot, setActiveLot] = useState(null)         // map → plot-detail handoff

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
    isAuthenticated: !!user,
    authLoading,

    // Local-stub login (used when VITE_USE_REMOTE=false).
    login: (profile) => setUser({ ...DEFAULT_USER, ...(profile || {}) }),
    logout: () => setUser(null),

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
      if (!ENV.USE_REMOTE) { setUser((u) => ({ ...u, name: fullName, phone })); return }
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
  }), [user, authLoading, activeBlockId, activeLot])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within <AppProvider>')
  return ctx
}

export default AppContext
