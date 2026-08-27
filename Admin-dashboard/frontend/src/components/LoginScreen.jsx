import { useState } from 'react'
import { useAdmin } from '../context/AdminContext'
import { ENV } from '../config/constants'

export default function LoginScreen() {
  const { login, signIn, authError } = useAdmin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')

  async function handleSubmit() {
    setLocalError('')
    if (!ENV.USE_REMOTE) return login(email ? { email } : undefined)

    setBusy(true)
    try {
      await signIn({ email, password })
    } catch (err) {
      setLocalError(err.message || 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(135deg,#1E3A0F 0%,#3A6B2F 50%,#5A9E4A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        display: 'flex', width: 900, minHeight: 520, borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 40px 100px rgba(0,0,0,.4)'
      }}>
        {/* Left panel */}
        <div style={{
          flex: 1, background: 'linear-gradient(160deg,rgba(30,58,15,.95),rgba(58,107,47,.9))',
          padding: '60px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', width: 300, height: 300, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,.07)', top: -80, right: -80
          }}/>
          <div style={{
            position: 'absolute', width: 200, height: 200, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,.05)', bottom: 40, left: -60
          }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{
              width: 48, height: 48, background: 'rgba(255,255,255,.15)', borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--ff-d)', fontSize: 22, color: '#fff', fontWeight: 700 }}>
              GraveLocator
            </h1>
          </div>
          <p style={{ fontSize: 28, fontFamily: 'var(--ff-d)', color: '#fff', lineHeight: 1.35, marginBottom: 16 }}>
            Admin Portal<br/>Calbayog City
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.65)', lineHeight: 1.6 }}>
            Cemetery Management System — manage plots, users,<br/>and digital memorials.
          </p>
        </div>

        {/* Right panel */}
        <div style={{ width: 380, background: '#fff', padding: '52px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontFamily: 'var(--ff-d)', fontSize: 22, color: 'var(--charcoal)', marginBottom: 6 }}>
            Sign In
          </h2>
          <p style={{ fontSize: 13, color: 'var(--dgray)', marginBottom: 32 }}>
            Access the admin dashboard
          </p>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 7 }}>
              Email Address
            </label>
            <input
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--lgray)', fontFamily: 'var(--ff-b)', fontSize: 14, color: 'var(--charcoal)', outline: 'none' }}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@calbayog.gov.ph"
              type="email"
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 7 }}>
              Password
            </label>
            <input
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--lgray)', fontFamily: 'var(--ff-b)', fontSize: 14, color: 'var(--charcoal)', outline: 'none' }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <input type="checkbox" style={{ width: 16, height: 16, accentColor: 'var(--sage)' }}/>
            <span style={{ fontSize: 13, color: 'var(--dgray)' }}>Enable two-factor authentication</span>
          </div>

          <span style={{ fontSize: 13, color: 'var(--sage)', cursor: 'pointer', marginBottom: 24, display: 'block' }}>
            Forgot your password?
          </span>

          {(localError || authError) && (
            <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 16 }}>{localError || authError}</p>
          )}

          <button
            className="login-btn"
            onClick={handleSubmit}
            disabled={busy}
            style={{
              width: '100%', padding: 13, borderRadius: 10,
              background: 'linear-gradient(135deg,var(--sage),var(--forest))',
              color: '#fff', border: 'none', fontFamily: 'var(--ff-b)',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              transition: 'opacity .15s,transform .15s'
            }}
          >
            {busy ? 'Signing in…' : 'Sign In to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  )
}