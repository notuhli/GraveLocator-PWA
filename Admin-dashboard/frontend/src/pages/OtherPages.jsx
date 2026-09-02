import { useState, useEffect } from 'react'
import { useUsers, useMemorialQueue, useBlockOccupancy, useNotifications, useAdminStaff } from '../hooks'
import { useAdmin } from '../context/AdminContext'
import { USER_STATUS_META, MEMORIAL_STATUS, MEMORIAL_STATUS_META } from '../config/adminStatus'
import { formatDate } from '../utils/date'
import { plotShort, plotLabel } from '../utils/plot'
import { PARK } from '../config/constants'
import * as api from '../api'

// ── Users (public site accounts) ──────────────────────────────────────────────
export function UsersPage() {
  const { users, loading, reload } = useUsers()
  const { openModal } = useAdmin()
  const [search, setSearch] = useState('')

  const filtered = users.filter((u) =>
    !search || `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const removeUser = async (id) => { await api.deleteUser(id); reload() }

  return (
    <div>
      <div className="page-header">
        <div><h2>User Management</h2><p>Manage registered users and their plot associations.</p></div>
        <button className="btn btn-primary" onClick={() => openModal('modal-adduser')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add User
        </button>
      </div>
      <div className="filter-bar">
        <input className="filter-input" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }}>Export CSV</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>User ID</th><th>Full Name</th><th>Email</th><th>Phone</th><th>Plots</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {!loading && filtered.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700, color: 'var(--sage)' }}>{u.id}</td>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone}</td>
                  <td title={u.plots.map(plotLabel).join(', ')}>{u.plots.length}</td>
                  <td>{formatDate(u.joined)}</td>
                  <td><span className={`badge ${USER_STATUS_META[u.status].badge}`}>{USER_STATUS_META[u.status].label}</span></td>
                  <td><div className="action-cell">
                    <button className="btn btn-ghost btn-xs" onClick={() => openModal('modal-edituser', u)}>Edit</button>
                    <button className="btn btn-outline btn-xs">View</button>
                    <button className="btn btn-danger btn-xs" onClick={() => removeUser(u.id)}>Delete</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Digital Memorials (moderation queue) ──────────────────────────────────────
export function MemorialsPage() {
  const { queue, loading, reload } = useMemorialQueue()
  const { modal, openModal } = useAdmin()
  const [search, setSearch] = useState('')

  const filtered = queue.filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()))
  const setStatus = async (id, status) => { await api.updateMemorialQueueStatus(id, status); reload() }

  // The Add Memorial modal creates a real row — refresh the queue once it closes.
  useEffect(() => { if (modal === null) reload() }, [modal])

  return (
    <div>
      <div className="page-header">
        <div><h2>Digital Memorial Management</h2><p>Review and manage digital memorial entries submitted by users.</p></div>
        <button className="btn btn-primary" onClick={() => openModal('modal-addmemorial')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Memorial
        </button>
      </div>
      <div className="filter-bar">
        <input className="filter-input" placeholder="Search by name of deceased…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name of Deceased</th><th>Submitted By</th><th>Plot</th><th>Birth Date</th><th>Death Date</th><th>Date Submitted</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {!loading && filtered.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 700 }}>{m.name}</td>
                  <td>{m.submittedBy}</td>
                  <td>{plotShort(m)}</td>
                  <td>{formatDate(m.birth)}</td>
                  <td>{formatDate(m.death)}</td>
                  <td>{formatDate(m.submitted)}</td>
                  <td><span className={`badge ${MEMORIAL_STATUS_META[m.status].badge}`}>{MEMORIAL_STATUS_META[m.status].label}</span></td>
                  <td><div className="action-cell">
                    {m.status === MEMORIAL_STATUS.PENDING && <button className="btn btn-ghost btn-xs" onClick={() => setStatus(m.id, MEMORIAL_STATUS.APPROVED)}>Approve</button>}
                    {m.status === MEMORIAL_STATUS.APPROVED && <button className="btn btn-amber btn-xs" onClick={() => setStatus(m.id, MEMORIAL_STATUS.FEATURED)}>Feature</button>}
                    {m.status === MEMORIAL_STATUS.FEATURED && <button className="btn btn-outline btn-xs" onClick={() => setStatus(m.id, MEMORIAL_STATUS.APPROVED)}>Unfeature</button>}
                    <button className="btn btn-ghost btn-xs">Edit</button>
                    <button className="btn btn-danger btn-xs">Delete</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Reports & Analytics ────────────────────────────────────────────────────────
export function ReportsPage() {
  const { occupancy } = useBlockOccupancy()

  return (
    <div>
      <div className="page-header">
        <div><h2>Reports & Analytics</h2><p>Visualize cemetery data across all digitized blocks.</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost">Export PDF</button>
          <button className="btn btn-primary">Export Excel</button>
        </div>
      </div>

      <div className="card">
        <p className="chart-title">Plot Occupancy by Block</p>
        <div className="progress-bar-list">
          {occupancy.map((b) => (
            <div key={b.blockId} className="progress-item">
              <div className="progress-label"><span>{b.name}</span><span style={{ fontWeight: 700, color: 'var(--sage)' }}>{Math.round(b.occupancyRate * 100)}%</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.round(b.occupancyRate * 100)}%` }}/></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <p className="chart-title">Blocks Summary</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Block</th><th>Digitized Lots</th><th>Occupied</th><th>Occupancy Rate</th></tr></thead>
            <tbody>
              {occupancy.map((b) => (
                <tr key={b.blockId}>
                  <td>{b.name}</td>
                  <td>{b.total}</td>
                  <td>{b.occupied}</td>
                  <td>{Math.round(b.occupancyRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Notifications ──────────────────────────────────────────────────────────────
export function NotificationsPage() {
  const { sent, stats, alerts, loading, reload } = useNotifications()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!message.trim()) return
    setSending(true)
    try {
      await api.sendNotification({ title: subject || 'Announcement', body: message })
      setSubject(''); setMessage('')
      reload()
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div><h2>Notifications & Alerts</h2><p>Send bulk notifications and review system alerts.</p></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18 }}>
        <div>
          <div className="notif-compose">
            <h3>Compose Notification</h3>
            <div className="modal-row" style={{ marginBottom: 14 }}>
              <div className="modal-field">
                <label>Recipients</label>
                <select className="filter-select" style={{ width: '100%' }}><option>All Users</option><option>Users with Plots</option><option>Specific User</option></select>
              </div>
              <div className="modal-field">
                <label>Subject</label>
                <input className="filter-input" style={{ width: '100%' }} placeholder="Notification subject…" value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
            </div>
            <div className="modal-field">
              <label>Message</label>
              <textarea className="filter-input" style={{ width: '100%', minHeight: 100, resize: 'vertical' }} placeholder="Write your notification message here…" value={message} onChange={e => setMessage(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={send} disabled={sending || !message.trim()}>{sending ? 'Sending…' : 'Send Now'}</button>
              <button className="btn btn-ghost">Schedule</button>
              <button className="btn btn-outline">Preview</button>
            </div>
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-16">
              <p className="chart-title" style={{ marginBottom: 0 }}>Sent Notifications</p>
            </div>
            <div>
              {!loading && sent.map((n) => (
                <div key={n.id} className="notif-list-item">
                  <div className={`notif-dot ${n.unread ? 'unread' : 'read'}`}/>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>{n.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--dgray)', marginTop: 2 }}>{n.body}</p>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--dgray)', flexShrink: 0 }}>{new Date(n.sentAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <p className="chart-title">Notification Stats</p>
            {stats && [
              ['Sent Today', stats.sentToday],
              ['This Week', stats.sentThisWeek],
              ['Total Users Reached', stats.usersReached],
              ['Open Rate', `${Math.round(stats.openRate * 100)}%`],
            ].map(([l, v]) => (
              <div key={l} className="detail-row">
                <span className="detail-label">{l}</span>
                <span style={{ fontWeight: 700, color: 'var(--charcoal)' }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <p className="chart-title">System Alerts</p>
            {alerts.map((a) => {
              const color = a.level === 'urgent' ? '#DC2626' : a.level === 'warning' ? '#B45309' : '#16A34A'
              return (
                <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--lgray)', alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }}/>
                  <p style={{ fontSize: 13, color: 'var(--charcoal)' }}>{a.message}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Settings ─────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const { staff, loading, reload } = useAdminStaff()
  const { openModal } = useAdmin()

  const removeStaff = async (id) => { await api.removeAdminStaff(id); reload() }

  return (
    <div>
      <div className="page-header">
        <div><h2>Settings</h2><p>Configure system preferences and admin access.</p></div>
        <button className="btn btn-primary">Save Changes</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div>
          <div className="card settings-section">
            <h3>Cemetery Information</h3>
            {[
              ['Cemetery Name', PARK.name],
              ['Address', PARK.address],
              ['Contact Number', PARK.tel],
              ['Tagline', PARK.tagline],
            ].map(([l, v]) => (
              <div key={l} className="modal-field" style={{ marginBottom: 12 }}>
                <label>{l}</label>
                <input defaultValue={v} />
              </div>
            ))}
            <p style={{ fontSize: 11, color: 'var(--dgray)', marginTop: 4 }}>
              These come from the shared config/constants.js both dashboards read —
              changing them here is meant to update one place, not each app separately.
            </p>
          </div>
        </div>

        <div>
          <div className="card settings-section">
            <h3>Notification Preferences</h3>
            {[
              ['Email notifications', true],
              ['SMS notifications', true],
              ['Memorial submission alerts', true],
              ['New user registration alerts', true],
              ['System alerts', false],
            ].map(([label, on]) => (
              <div key={label} className="settings-row">
                <span style={{ fontSize: 13, color: 'var(--charcoal)' }}>{label}</span>
                <div className={`toggle-switch ${on ? '' : 'off'}`}/>
              </div>
            ))}
          </div>

          <div className="card settings-section" style={{ marginTop: 18 }}>
            <h3>Admin Staff</h3>
            {!loading && staff.map(a => (
              <div key={a.id} className="settings-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>{a.avatar}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--dgray)' }}>{a.role}</p>
                  </div>
                </div>
                <button className="btn btn-danger btn-xs" onClick={() => removeStaff(a.id)}>Remove</button>
              </div>
            ))}
            <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => openModal('modal-addadmin')}>+ Add Staff</button>
          </div>
        </div>
      </div>
    </div>
  )
}
