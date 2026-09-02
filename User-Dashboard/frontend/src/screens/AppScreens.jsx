import { useState, useEffect } from 'react'
import BottomNav from '../components/BottomNav'
import { useMemorials, useBlocks } from '../hooks'
import { useApp } from '../context/AppContext'
import * as api from '../api'

// ── MemorialsScreen ──────────────────────────────────────────────────────────
export function MemorialsScreen({ onNavigate, onBack, modal }) {
  const { memorials, loading, reload } = useMemorials()
  const { blocks } = useBlocks()
  const creating = modal === 'create'
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [deathDate, setDeathDate] = useState('')
  const [blockId, setBlockId] = useState('')
  const [lotNo, setLotNo] = useState('')
  const [tribute, setTribute] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  function resetForm() {
    setFullName(''); setBirthDate(''); setDeathDate('')
    setBlockId(''); setLotNo(''); setTribute(''); setNotice('')
  }

  useEffect(() => {
    if (!creating) resetForm()
  }, [creating])

  async function handlePublish() {
    if (!fullName) return
    setSubmitting(true)
    try {
      await api.createMemorial({ name: fullName, birthDate, deathDate, blockId, lotNo, quote: tribute })
      resetForm()
      onBack('memorials')
      reload()
    } catch (err) {
      setNotice(err.message || 'Could not submit memorial. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (creating) return (
    <div className="screen active" style={{ background:'var(--cream)' }}>
      <div className="hdr hdr-row" style={{ flexShrink:0 }}>
        <button className="back-btn" onClick={() => { resetForm(); onBack('memorials') }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2>Create Memorial</h2>
      </div> 
      <div className="form-wrap">
        <div className="upload-zone">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
          <span>Upload Photo or Video</span>
        </div>
        <div className="field"><label className="lbl">Full Name</label><input className="inp" placeholder="Name of the deceased" value={fullName} onChange={(e)=>setFullName(e.target.value)}/></div>
        <div className="field"><label className="lbl">Birth Date</label><input className="inp" type="date" value={birthDate} onChange={(e)=>setBirthDate(e.target.value)}/></div>
        <div className="field"><label className="lbl">Death Date</label><input className="inp" type="date" value={deathDate} onChange={(e)=>setDeathDate(e.target.value)}/></div>
        <div className="field">
          <label className="lbl">Block</label>
          <select className="inp" value={blockId} onChange={(e)=>setBlockId(e.target.value)}>
            <option value="">Select a block…</option>
            {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="field"><label className="lbl">Lot Number</label><input className="inp" type="number" min="1" placeholder="e.g. 204" value={lotNo} onChange={(e)=>setLotNo(e.target.value)}/></div>
        <div className="field mb-20"><label className="lbl">Tribute Message</label><textarea className="inp" rows="4" placeholder="Share a tribute or memory…" value={tribute} onChange={(e)=>setTribute(e.target.value)}/></div>
        {notice && <p style={{ color:'#DC2626', fontSize:13, margin:'0 0 12px' }}>{notice}</p>}
        <button className="btn btn-primary btn-full" onClick={handlePublish} disabled={submitting || !fullName}>
          {submitting ? 'Submitting…' : 'Publish Memorial'}
        </button>
        <p style={{ fontSize:12, color:'var(--stone)', textAlign:'center', marginTop:10 }}>
          Submissions are reviewed by an admin before appearing publicly.
        </p>
      </div>
    </div>
  )

  return (
    <div className="screen active" style={{ background:'var(--cream)' }}>
      <div className="hdr flex justify-between items-center" style={{ flexDirection:'row' }}>
        <h2>Digital Memorials</h2>
        <button onClick={() => onNavigate('memorials', {}, { modal: 'create' })} style={{ background:'rgba(255,255,255,.2)', border:'none', borderRadius:10, padding:'6px 14px', color:'#fff', fontFamily:'var(--ff-b)', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Create
        </button>
      </div>
      <div className="scroll-body">
        {loading && <p className="f13 c-stone" style={{ textAlign:'center', padding:20 }}>Loading memorials…</p>}
        {memorials.map(m => (
          <div key={m.id || m.name} className="memorial-card">
            <div className="flex gap-12 items-center mb-10">
              <div className="mem-photo">{m.emoji}</div>
              <div>
                <p style={{ margin:0, fontFamily:'var(--ff-d)', fontSize:16, fontWeight:700, color:'var(--charcoal)' }}>{m.name}</p>
                <p className="f12 c-stone" style={{ margin:'2px 0 0' }}>{m.dates}</p>
              </div>
            </div>
            <p className="f13 c-slate italic lh-16" style={{ margin:'0 0 12px' }}>{m.quote}</p>
            <div className="mem-actions-row">
              <div className="mem-react">
                <button className="react-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#D4827A" stroke="#D4827A" strokeWidth="1"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> {m.likes}
                </button>
                <button className="react-btn">💬 {m.comments}</button>
              </div>
              <button className="share-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share
              </button>
            </div>
          </div>
        ))}
      </div>
      <BottomNav active="memorials" onNavigate={onNavigate} />
    </div>
  )
}

// ── ProfileScreen ────────────────────────────────────────────────────────────
const SETTINGS_GROUPS = [
  { label:'Account', items:[
    { id:'edit-profile', title:'Edit Profile', sub:'Name, email, phone', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { id:'my-reservations', title:'My Reservations', sub:'Track your lot reservations', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> },
    { id:'manage-password', title:'Manage Password', sub:'Update your password', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> },
    { id:'notifications', title:'Notifications', sub:'Alerts and reminders', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> },
  ]},
  { label:'Preferences', items:[
    { id:'language', title:'Language', sub:'English', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg> },
    { id:'theme', title:'App Theme', sub:'Default (Light)', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A7C3F" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg> },
  ]},
]

const ChevronRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B9EA0" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>

// Shared small modal shell — dims the background, centers a white card.
function SettingsModal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, width:'100%', maxWidth:360 }} onClick={(e)=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:17, fontFamily:'var(--ff-d)' }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, lineHeight:1, color:'#8B9EA0' }}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function EditProfileModal({ user, onClose }) {
  const { updateProfile } = useApp()
  const [fullName, setFullName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setBusy(true); setError('')
    try {
      await updateProfile({ fullName, phone })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save changes.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsModal title="Edit Profile" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <input className="inp" placeholder="Full Name" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
        <input className="inp" placeholder="Phone Number" value={phone} onChange={(e)=>setPhone(e.target.value)} />
        <input className="inp" value={user?.email || ''} disabled style={{ opacity:.6 }} />
        <p style={{ fontSize:12, color:'#8B9EA0', margin:0 }}>Email can't be changed here.</p>
        {error && <p style={{ color:'#DC2626', fontSize:13, margin:0 }}>{error}</p>}
        <button className="btn btn-primary btn-full" onClick={handleSave} disabled={busy}>
          {busy ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </SettingsModal>
  )
}

function ManagePasswordModal({ onClose }) {
  const { changePassword } = useApp()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSave() {
    setError('')
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.')
    if (newPassword !== confirmPassword) return setError("Passwords don't match.")

    setBusy(true)
    try {
      await changePassword(newPassword)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Could not update password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsModal title="Manage Password" onClose={onClose}>
      {success ? (
        <p style={{ color:'#166534', fontSize:14 }}>Password updated successfully.</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input className="inp" placeholder="New Password" type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} />
          <input className="inp" placeholder="Confirm New Password" type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} />
          {error && <p style={{ color:'#DC2626', fontSize:13, margin:0 }}>{error}</p>}
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={busy}>
            {busy ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      )}
    </SettingsModal>
  )
}

export function ProfileScreen({ onNavigate, onBack, onLogout, modal }) {
  const { user } = useApp()
  const profile = user || { name:'Maria Santos', email:'m.santos@email.com', phone:'+63 912 345 6789' }
  const openModal = modal || null

  function handleItemClick(id) {
    if (id === 'edit-profile' || id === 'manage-password') {
      onNavigate('profile', {}, { modal: id })
    } else if (id === 'my-reservations') {
      onNavigate('my-reservations')
    }
    // 'notifications' / 'language' / 'theme': not built out yet — no-op for now.
  }

  return (
    <div className="screen active" style={{ background:'var(--cream)' }}>
      <div className="profile-hdr">
        <h2>Profile &amp; Settings</h2>
        <div className="flex gap-12 items-center">
          <div className="avatar-box">👤</div>
          <div>
            <p className="profile-name">{profile.name}</p>
            <p className="profile-sub">{profile.email}</p>
            <p className="profile-sub">{profile.phone}</p>
          </div>
        </div>
      </div>
      <div className="scroll-body">
        {SETTINGS_GROUPS.map(g => (
          <div key={g.label} className="settings-group">
            <p className="settings-label">{g.label}</p>
            <div className="settings-card">
              {g.items.map(item => (
                <div key={item.title} className="settings-item" onClick={() => handleItemClick(item.id)} style={{ cursor:'pointer' }}>
                  <div className="settings-icon">{item.icon}</div>
                  <div className="flex-1">
                    <p className="settings-title">{item.title}</p>
                    <p className="settings-sub">{item.sub}</p>
                  </div>
                  <ChevronRight/>
                </div>
              ))}
            </div>
          </div>
        ))}
        <button className="logout-btn" onClick={onLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Log Out
        </button>
      </div>
      <BottomNav active="profile" onNavigate={onNavigate} />

      {openModal === 'edit-profile' && <EditProfileModal user={user} onClose={() => onBack('profile')} />}
      {openModal === 'manage-password' && <ManagePasswordModal onClose={() => onBack('profile')} />}
    </div>
  )
}