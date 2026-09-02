// ─────────────────────────────────────────────────────────────────────────────
// ADMIN CONTEXT — auth + navigation + modal state.
// When VITE_USE_REMOTE=true, auth is backed by real Supabase Auth (RLS on the
// blocks/lots tables requires profiles.role = 'admin' for that signed-in user
// or writes will be rejected). Otherwise falls back to the original local
// stub (login() just flips a flag) so the UI still runs with zero setup.
//
// Modal state lives here (not DOM classList) so a modal can be opened with a
// specific record attached (e.g. "edit this plot") and any submit handler can
// call the api/ layer and close itself — no document.getElementById reaching
// across the component tree.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { ENV } from '../config/constants'
import { supabase } from '../api/supabaseClient'

const AdminContext = createContext(null)

const DEFAULT_ADMIN = {
  name: 'Admin User',
  email: 'admin@calbayog.gov.ph',
  role: 'Super Admin',
}

export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(null)          // null = logged out
  const [authLoading, setAuthLoading] = useState(ENV.USE_REMOTE)
  const [authError, setAuthError] = useState('')
  const [activePage, setActivePage] = useState('dashboard')
  const [modal, setModal] = useState(null)           // { id, record? } | null
  const [activeBlockId, setActiveBlockId] = useState(null) // Plot Management: which block is open
  const [activeLot, setActiveLot] = useState(null)          // Plot Management: selected lot
  const [sidebarOpen, setSidebarOpen] = useState(false)      // mobile: off-canvas sidebar drawer

  function toAdmin(session, profileRole) {
    const u = session.user
    return {
      id: u.id,
      name: u.user_metadata?.full_name || DEFAULT_ADMIN.name,
      email: u.email,
      role: profileRole === 'admin' ? 'Super Admin' : 'Staff',
    }
  }

  async function loadSessionAdmin(session) {
    if (!session) { setAdmin(null); return }
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', session.user.id).maybeSingle()
    setAdmin(toAdmin(session, profile?.role))
  }

  // Restore + subscribe to the Supabase session when running against real auth.
  useEffect(() => {
    if (!ENV.USE_REMOTE || !supabase) return

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await loadSessionAdmin(session)
      setAuthLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSessionAdmin(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo(() => ({
    admin,
    isAuthenticated: !!admin,
    authLoading,
    authError,

    // Local-stub login (used when VITE_USE_REMOTE=false).
    login: (profile) => setAdmin({ ...DEFAULT_ADMIN, ...(profile || {}) }),
    logout: () => setAdmin(null),

    // Real Supabase auth — LoginScreen calls this when remote.
    signIn: async ({ email, password }) => {
      setAuthError('')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setAuthError(error.message); throw error }
    },
    signOut: async () => {
      await supabase.auth.signOut()
    },

    activePage,
    setActivePage,

    modal,
    openModal: (id, record = null) => setModal({ id, record }),
    closeModal: () => setModal(null),

    activeBlockId,
    setActiveBlockId,
    activeLot,
    setActiveLot,

    sidebarOpen,
    toggleSidebar: () => setSidebarOpen((o) => !o),
    closeSidebar: () => setSidebarOpen(false),
  }), [admin, authLoading, authError, activePage, modal, activeBlockId, activeLot, sidebarOpen])

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within <AdminProvider>')
  return ctx
}

export default AdminContext
