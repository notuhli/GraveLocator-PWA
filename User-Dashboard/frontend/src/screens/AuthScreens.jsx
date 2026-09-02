import ParkMap from '../components/ParkMap'
import { ENV } from '../config/constants'
import { useApp } from '../context/AppContext'

// ── SplashScreen ────────────────────────────────────────────────────────────
export function SplashScreen({ onDone }) {
  return (
    <div className="screen active" id="screen-splash" style={{ background: 'linear-gradient(160deg,#2D5016 0%,#4A7C3F 60%,#7BAE6E 100%)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {/* Decorative circles */}
      {[{w:300,h:300,t:-80,r:-80},{w:200,h:200,b:60,l:-60}].map((c,i) => (
        <div key={i} style={{ position:'absolute', width:c.w, height:c.h, borderRadius:'50%', border:'1px solid rgba(255,255,255,.1)', top:c.t, right:c.r, bottom:c.b, left:c.l }}/>
      ))}
      <div className="splash-logo-box">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="#7BAE6E">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
      <p className="splash-title">GraveLocator</p>
      <p className="splash-sub">Cemetery Plot Finder · Calbayog City</p>
      <div className="splash-dots" style={{ position:'absolute', bottom:60 }}>
        {['#7BAE6E','rgba(255,255,255,.4)','rgba(255,255,255,.4)'].map((c,i) => (
          <div key={i} className="splash-dot" style={{ background:c, animation:`pulse 1.2s ease-in-out ${i*.4}s infinite alternate` }}/>
        ))}
      </div>
    </div>
  )
}

// ── OnboardingScreen ─────────────────────────────────────────────────────────
const slides = [
  { icon:'#2D5016', bg:'rgba(45,80,22,.13)', border:'rgba(45,80,22,.2)', fill:'#2D5016', title:'Locate Cemetery Plots', desc:'Easily find any plot in Calbayog City Cemetery with our interactive map. Filter by availability, section, and more.', svgPath:<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#2D5016"/> },
  { icon:'#4A7C3F', bg:'rgba(74,124,63,.13)', border:'rgba(74,124,63,.2)', title:'Browse Blocks & Lots', desc:'Explore the whole park from the official map. Tap any block to see its lots, classifications, and status.', svgPath:<path d="M9 20l-5.5 2.5V6L9 3.5m0 16.5l6-2.5m-6 2.5V3.5m6 14l5.5 2.5V6L15 3.5m0 14V3.5m0 0L9 6" fill="none" stroke="#4A7C3F" strokeWidth="2"/> },
  { icon:'#C9A84C', bg:'rgba(201,168,76,.13)', border:'rgba(201,168,76,.2)', title:'Create Digital Memorials', desc:'Honor your loved ones with a digital tribute. Share memories, photos, and tributes with family and friends.', svgPath:<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="none" stroke="#C9A84C" strokeWidth="2"/> },
]

import { useState } from 'react'

export function OnboardingScreen({ onNext }) {
  const [current, setCurrent] = useState(0)
  const s = slides[current]
  const isLast = current === slides.length - 1

  return (
    <div className="screen active" style={{ background: 'var(--cream)' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 32px 16px' }}>
        <div className="slide-icon-box" style={{ background:s.bg, border:`2px solid ${s.border}` }}>
          <svg width="56" height="56" viewBox="0 0 24 24">{s.svgPath}</svg>
        </div>
        <h2 className="slide-title">{s.title}</h2>
        <p className="slide-desc">{s.desc}</p>
      </div>
      <div className="slide-dots">
        {slides.map((_,i) => <div key={i} className={`sdot${i===current?' active':''}`} onClick={()=>setCurrent(i)}/>)}
      </div>
      <div className="ob-footer">
        {isLast
          ? <button className="btn btn-primary" style={{width:'100%'}} onClick={onNext}>Get Started <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></button>
          : <>
              <button style={{background:'none',border:'none',cursor:'pointer',fontSize:14,color:'#8B9EA0',textAlign:'center'}} onClick={onNext}>Skip</button>
              <button className="btn btn-primary btn-sm" onClick={()=>setCurrent(c=>c+1)}>Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></button>
            </>
        }
      </div>
    </div>
  )
}

// ── LoginScreen ──────────────────────────────────────────────────────────────
export function LoginScreen({ onLogin }) {
  const [tab, setTab] = useState('login')     // 'login' | 'signup' | 'verify'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showResend, setShowResend] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const { signIn, signUp, resendConfirmation, verifySignupCode } = useApp()

  function resetMessages() {
    setError(''); setNotice(''); setShowResend(false)
  }

  function switchTab(next) {
    setTab(next)
    resetMessages()
  }

  async function handleSubmit() {
    resetMessages()

    // Local-stub mode (no Supabase configured yet): skip straight through.
    if (!ENV.USE_REMOTE) return onLogin()

    setBusy(true)
    try {
      if (tab === 'login') {
        await signIn({ email, password })
        onLogin()
      } else if (tab === 'signup') {
        const { confirmedImmediately } = await signUp({ email, password, fullName, phone })
        if (confirmedImmediately) {
          onLogin()
        } else {
          // No session yet — waiting on the 6-digit code from email.
          setNotice(`We sent a 6-digit code to ${email}. Enter it below to finish signing up.`)
          setTab('verify')
        }
      } else {
        // tab === 'verify'
        await verifySignupCode(email, code.trim())
        onLogin()
      }
    } catch (err) {
      const msg = err.message || 'Something went wrong. Please try again.'
      setError(msg)
      if (/email.*not.*confirmed/i.test(msg)) setShowResend(true)
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    setResendBusy(true)
    setError('')
    try {
      await resendConfirmation(email)
      setNotice('New code sent — check your inbox (and spam folder).')
      setShowResend(false)
    } catch (err) {
      setError(err.message || 'Could not resend the code. Try again in a moment.')
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <div className="screen active" style={{ background:'var(--cream)' }}>
      <div className="login-hdr">
        <div className="login-logo-row">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#7BAE6E">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <h1>GraveLocator</h1>
        </div>
        <p>Calbayog City Cemetery Portal</p>
      </div>

      {tab !== 'verify' && (
        <div className="tab-bar">
          <button className={`tab-btn${tab==='login'?' active':''}`} onClick={()=>switchTab('login')}>Log In</button>
          <button className={`tab-btn${tab==='signup'?' active':''}`} onClick={()=>switchTab('signup')}>Sign Up</button>
        </div>
      )}

      <div className="login-scroll">
        <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:4 }}>
          {tab === 'verify' ? (
            <>
              <input
                className="inp"
                placeholder="6-digit code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e)=>setCode(e.target.value.replace(/\D/g,''))}
                style={{ textAlign:'center', letterSpacing:6, fontSize:20 }}
              />
              {error && <p style={{ color:'#DC2626', fontSize:13, margin:0 }}>{error}</p>}
              {notice && <p style={{ color:'#166534', fontSize:13, margin:0 }}>{notice}</p>}
              <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={busy || code.length !== 6}>
                {busy ? 'Verifying…' : 'Confirm Code'}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendBusy}
                style={{ background:'none', border:'none', color:'#4A7C3F', fontSize:13, cursor:'pointer', textDecoration:'underline' }}
              >
                {resendBusy ? 'Sending…' : "Didn't get a code? Resend"}
              </button>
            </>
          ) : (
            <>
              {tab==='signup' && <input className="inp" placeholder="Full Name" value={fullName} onChange={(e)=>setFullName(e.target.value)}/>}
              <input className="inp" placeholder="Email Address" type="email" value={email} onChange={(e)=>setEmail(e.target.value)}/>
              {tab==='signup' && <input className="inp" placeholder="Phone Number" value={phone} onChange={(e)=>setPhone(e.target.value)}/>}
              <input className="inp" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)}/>
              {error && <p style={{ color:'#DC2626', fontSize:13, margin:0 }}>{error}</p>}
              {showResend && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendBusy}
                  style={{ background:'none', border:'none', color:'#4A7C3F', fontSize:13, textAlign:'left', padding:0, cursor:'pointer', textDecoration:'underline' }}
                >
                  {resendBusy ? 'Sending…' : 'Resend confirmation code'}
                </button>
              )}
              {notice && <p style={{ color:'#166534', fontSize:13, margin:0 }}>{notice}</p>}
              {tab==='login' && <p className="forgot">Forgot Password?</p>}
              <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={busy}>
                {busy ? 'Please wait…' : tab==='login' ? 'Log In' : 'Create Account'}
              </button>
            </>
          )}
        </div>
        <div className="divider-row">
          <div className="divider-line"/><span className="divider-txt">or continue with</span><div className="divider-line"/>
        </div>
        <div className="social-row">
          <button className="social-btn">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span style={{fontSize:13,fontWeight:600,color:'var(--charcoal)'}}>Google</span>
          </button>
          <button className="social-btn fb">
            <span style={{color:'#fff',fontWeight:700,fontSize:16}}>f</span>
            <span style={{fontSize:13,fontWeight:600,color:'#fff'}}>Facebook</span>
          </button>
        </div>
      </div>
    </div>
  )
}
// ── MapIntroScreen ───────────────────────────────────────────────────────────
// The app's first screen: an animated map of the whole memorial park. The nine
// blocks draw themselves in, then the screen hands off to onboarding. Tap
// anywhere to continue immediately. (MobileApp also auto-advances on a timer.)
export function MapIntroScreen({ onDone }) {
  return (
    <div
      className="screen active pm-intro"
      onClick={onDone}
      role="button"
      aria-label="Calbayog Memorial Park — tap to continue"
    >
      <div className="pm-intro-brand">
        <div className="pm-intro-logo">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#7BAE6E">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div>
          <p className="pm-intro-title">GraveLocator</p>
          <p className="pm-intro-sub">Calbayog Memorial Park · Brgy. Rawis</p>
        </div>
      </div>

      <div className="pm-intro-stage">
        <ParkMap animate interactive={false} />
      </div>

      <p className="pm-intro-tagline">Where love outlasts a lifetime</p>
      <p className="pm-intro-hint">Tap to continue</p>
    </div>
  )
}